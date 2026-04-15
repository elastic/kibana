/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import type { IWaterfallGetRelatedErrorsHref } from '../../../../../../../common/waterfall/typings';
import { useAnyOfApmParams } from '../../../../../../hooks/use_apm_params';
import { useDiscoverHref } from '../../../../../shared/links/discover_links/use_discover_href';
import { WaterfallSizeWarning } from '../../../../../shared/trace_waterfall/waterfall_size_warning';
import {
  TimelineAxisContainer,
  VerticalLinesContainer,
} from '../../../../../shared/charts/timeline';
import { getAgentMarks } from '../marks/get_agent_marks';
import { getErrorMarks } from '../marks/get_error_marks';
import { AccordionWaterfall } from './accordion_waterfall';
import type {
  IWaterfall,
  IWaterfallSpanOrTransaction,
} from './waterfall_helpers/waterfall_helpers';

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
  getRelatedErrorsHref?: IWaterfallGetRelatedErrorsHref;
  serviceBadgesHeight?: number;
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
  serviceBadgesHeight = 0,
}: Props) {
  const { euiTheme } = useEuiTheme();
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);
  const {
    query: { rangeFrom, rangeTo },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/dependencies/operation'
  );
  const traceId = waterfall.entryTransaction?.trace.id;

  const discoverHref = useDiscoverHref({
    indexType: 'traces',
    rangeFrom,
    rangeTo,
    queryParams: { traceId, sortDirection: 'ASC' },
  });

  const { duration } = waterfall;

  const agentMarks = getAgentMarks(waterfall.entryTransaction?.transaction.marks?.agent);
  const errorMarks = getErrorMarks(waterfall.errorItems);

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
        <WaterfallSizeWarning
          traceDocsTotal={waterfall.traceDocsTotal}
          maxTraceItems={waterfall.maxTraceItems}
          discoverHref={discoverHref}
          data-test-subj="apmWaterfallSizeWarning"
        />
      )}

      <div
        data-test-subj="apmWaterfallTimelineContainer"
        data-is-embeddable={String(isEmbeddable ?? false)}
        data-service-badges-height={String(serviceBadgesHeight)}
        css={css`
          display: flex;
          ${isEmbeddable
            ? 'position: relative;'
            : `
            position: sticky;
            top: calc(var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0)) + ${serviceBadgesHeight}px);`}
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
