/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiCallOut, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import {
  getAgentMarks,
  TimelineAxisContainer,
  VerticalLinesContainer,
  type WaterfallGetRelatedErrorsHref,
} from '@kbn/apm-ui-shared';

import { getErrorMarks } from '../marks/get_error_marks';
import { AccordionWaterfall } from './accordion_waterfall';
import type {
  IWaterfall,
  IWaterfallSpanOrTransaction,
} from './waterfall_helpers/waterfall_helpers';
import { useGetErrorDetailLink } from '../../../../../shared/links/apm/error_detail_link';
import { useAnyOfApmParams } from '../../../../../../hooks/use_apm_params';
import { TRACE_ID, TRANSACTION_ID } from '../../../../../../../common/es_fields/apm';

const Container = styled.div`
  transition: 0.1s padding ease;
  position: relative;
`;

const WaterfallItemsContainer = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.euiTheme.colors.mediumShade};
`;

interface Props {
  waterfallItemId?: string;
  waterfall: IWaterfall;
  showCriticalPath: boolean;
  onNodeClick?: (item: IWaterfallSpanOrTransaction, flyoutDetailTab: string) => void;
  displayLimit?: number;
  isEmbeddable?: boolean;
  scrollElement?: Element;
  getRelatedErrorsHref?: WaterfallGetRelatedErrorsHref;
}

function getWaterfallMaxLevel(waterfall: IWaterfall) {
  const entryId = waterfall.entryWaterfallTransaction?.id;
  if (!entryId) {
    return 0;
  }

  let maxLevel = 1;
  const visited = new Set<string>();
  const queue: Array<{ id: string; level: number }> = [{ id: entryId, level: 1 }];

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    const children = waterfall.childrenByParentId[id] || [];

    maxLevel = Math.max(maxLevel, level);
    visited.add(id);

    children.forEach((child) => {
      if (child.id !== id && !visited.has(child.id)) {
        queue.push({ id: child.id, level: level + 1 });
        visited.add(child.id);
      }
    });
  }

  return maxLevel;
}

const MAX_DEPTH_OPEN_LIMIT = 2;

export function Waterfall({
  waterfall,
  waterfallItemId,
  showCriticalPath,
  onNodeClick,
  displayLimit,
  isEmbeddable,
  scrollElement,
  getRelatedErrorsHref,
}: Props) {
  const { euiTheme } = useEuiTheme();
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);
  const { duration } = waterfall;

  const { query } = useAnyOfApmParams(
    '/dependencies/operation',
    '/traces/explorer/waterfall',
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view'
  );

  const serviceGroup = 'serviceGroup' in query ? query.serviceGroup : '';

  const getErrorDetailLink = useGetErrorDetailLink();

  const errorLinksMap = useMemo(() => {
    return waterfall.errorItems.reduce<Map<string, string>>((acc, error) => {
      if (!error.doc.error.grouping_key) {
        return acc;
      }

      const traceId = error.doc.trace?.id;
      const transactionId = error.doc.transaction?.id;

      const kueryParts = [
        traceId && `${TRACE_ID} : "${traceId}"`,
        transactionId && `${TRANSACTION_ID} : "${transactionId}"`,
      ].filter(Boolean);

      const queryParam = {
        ...query,
        serviceGroup,
        kuery: kueryParts.join(' and '),
      };
      const errorHref = getErrorDetailLink({
        serviceName: error.doc.service.name,
        errorGroupId: error.doc.error.grouping_key,
        query: queryParam,
      });

      acc.set(error.id, errorHref);

      return acc;
    }, new Map<string, string>());
  }, [waterfall.errorItems, query, getErrorDetailLink, serviceGroup]);

  const agentMarks = getAgentMarks(waterfall.entryTransaction?.transaction.marks?.agent);
  const errorMarks = getErrorMarks(waterfall.errorItems, errorLinksMap);

  const timelineMargins = useMemo(() => {
    // Calculate the left margin relative to the deepest level, or 100px, whichever
    // is more.
    const maxLevel = getWaterfallMaxLevel(waterfall);
    return {
      top: 40,
      left: Math.max(100, maxLevel * 10),
      right: 50,
      bottom: 0,
    };
  }, [waterfall]);

  return (
    <Container>
      {waterfall.exceedsMax && (
        <EuiCallOut
          announceOnMount
          data-test-subj="apmWaterfallSizeWarning"
          color="warning"
          size="s"
          iconType="warning"
          title={i18n.translate('xpack.apm.waterfall.exceedsMax', {
            defaultMessage:
              'The number of items in this trace is {traceDocsTotal} which is higher than the current limit of {maxTraceItems}. Please increase the limit via `xpack.apm.ui.maxTraceItems` to see the full trace',
            values: {
              traceDocsTotal: waterfall.traceDocsTotal,
              maxTraceItems: waterfall.maxTraceItems,
            },
          })}
        />
      )}

      <div
        css={css`
          display: flex;
          ${isEmbeddable
            ? 'position: relative;'
            : `
            position: sticky;
            top: var(--euiFixedHeadersOffset, 0);`}
          z-index: ${euiTheme.levels.menu};
          background-color: ${euiTheme.colors.emptyShade};
          border-bottom: 1px solid ${euiTheme.colors.mediumShade};
        `}
      >
        <EuiButtonIcon
          data-test-subj="apmWaterfallButton"
          size="m"
          css={css`
            position: absolute;
            z-index: ${euiTheme.levels.menu};
            padding: ${euiTheme.size.m};
            width: auto;
          `}
          aria-label={i18n.translate('xpack.apm.waterfall.foldButton.ariaLabel', {
            defaultMessage: 'Click to {isAccordionOpen} the waterfall',
            values: {
              isAccordionOpen: isAccordionOpen
                ? i18n.translate('xpack.apm.waterfall.foldButton.ariaLabel.fold', {
                    defaultMessage: 'fold',
                  })
                : i18n.translate('xpack.apm.waterfall.foldButton.ariaLabel.unfold', {
                    defaultMessage: 'unfold',
                  }),
            },
          })}
          iconType={isAccordionOpen ? 'fold' : 'unfold'}
          onClick={() => {
            setIsAccordionOpen((isOpen) => !isOpen);
          }}
        />
        <TimelineAxisContainer
          marks={[...agentMarks, ...(isEmbeddable ? [] : errorMarks)]}
          xMax={duration}
          margins={timelineMargins}
        />
      </div>

      <VerticalLinesContainer
        marks={[...agentMarks, ...errorMarks]}
        xMax={duration}
        margins={timelineMargins}
      />
      <WaterfallItemsContainer>
        {!waterfall.entryWaterfallTransaction ? null : (
          <AccordionWaterfall
            isOpen={isAccordionOpen}
            waterfallItemId={waterfallItemId}
            duration={duration}
            waterfall={waterfall}
            timelineMargins={timelineMargins}
            onClickWaterfallItem={onNodeClick}
            showCriticalPath={showCriticalPath}
            maxLevelOpen={
              waterfall.traceDocsTotal > 500 ? MAX_DEPTH_OPEN_LIMIT : waterfall.traceDocsTotal
            }
            displayLimit={displayLimit}
            isEmbeddable={isEmbeddable}
            scrollElement={scrollElement}
            getRelatedErrorsHref={getRelatedErrorsHref}
          />
        )}
      </WaterfallItemsContainer>
    </Container>
  );
}
