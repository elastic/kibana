/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { useTheme } from '../../../../../../hooks/use_theme';
import {
  VerticalLinesContainer,
  TimelineAxisContainer,
} from '../../../../../shared/charts/timeline';
import { getAgentMarks } from '../marks/get_agent_marks';
import { getErrorMarks } from '../marks/get_error_marks';
import { AccordionWaterfall } from './accordion_waterfall';
import type { IWaterfall, IWaterfallItem } from './waterfall_helpers/waterfall_helpers';

interface Props {
  waterfallItemId?: string;
  waterfall: IWaterfall;
  showCriticalPath: boolean;
  scrollElement?: React.RefObject<HTMLDivElement>;
  showRelatedErrors?: boolean;
  onClickWaterfallItem?: (item: IWaterfallItem, flyoutDetailTab: string) => void;
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

interface Props {
  waterfallItemId?: string;
  waterfall: IWaterfall;
  showCriticalPath: boolean;
  scrollElement?: React.RefObject<HTMLDivElement>;
  showRelatedErrors?: boolean;
  stickyHeader?: boolean;
  onClickWaterfallItem?: (item: IWaterfallItem, flyoutDetailTab: string) => void;
}

export function Waterfall({
  waterfall,
  waterfallItemId,
  showCriticalPath,
  scrollElement,
  showRelatedErrors = true,
  stickyHeader = true,
  onClickWaterfallItem,
}: Props) {
  const theme = useTheme();
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);

  const { duration, entryTransaction, errorItems } = waterfall;

  const agentMarks = getAgentMarks(entryTransaction);
  const errorMarks = getErrorMarks(errorItems);

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
    <div
      css={css`
        transition: 0.1s padding ease;
        position: relative;
      `}
    >
      {waterfall.exceedsMax && (
        <EuiCallOut
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
          position: sticky;
          top: ${stickyHeader ? 'var(--euiFixedHeadersOffset, 0)' : '0'};
          z-index: ${theme.eui.euiZLevel2};
          background-color: ${theme.eui.euiColorEmptyShade};
          border-bottom: 1px solid ${theme.eui.euiColorMediumShade};
        `}
      >
        <EuiButtonEmpty
          data-test-subj="apmWaterfallButton"
          css={css`
            position: absolute;
            z-index: ${theme.eui.euiZLevel2};
          `}
          iconType={isAccordionOpen ? 'fold' : 'unfold'}
          onClick={() => {
            setIsAccordionOpen((isOpen) => !isOpen);
          }}
        />
        <TimelineAxisContainer
          marks={[...agentMarks, ...errorMarks]}
          xMax={duration}
          margins={timelineMargins}
        />
      </div>

      <VerticalLinesContainer
        marks={[...agentMarks, ...errorMarks]}
        xMax={duration}
        margins={timelineMargins}
      />
      <div
        css={css`
          border-bottom: 1px solid ${theme.eui.euiColorMediumShade};
        `}
      >
        {!waterfall.entryWaterfallTransaction ? null : (
          <AccordionWaterfall
            isOpen={isAccordionOpen}
            waterfallItemId={waterfallItemId}
            waterfall={waterfall}
            timelineMargins={timelineMargins}
            scrollElement={scrollElement}
            onClickWaterfallItem={onClickWaterfallItem}
            showCriticalPath={showCriticalPath}
            showRelatedErrors={showRelatedErrors}
          />
        )}
      </div>
    </div>
  );
}
