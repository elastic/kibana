/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiCallOut, type EuiThemeComputed, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { History } from 'history';
import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { css } from '@emotion/react';
import { useTheme } from '../../../../../../hooks/use_theme';
import {
  VerticalLinesContainer,
  TimelineAxisContainer,
} from '../../../../../shared/charts/timeline';
import { fromQuery, toQuery } from '../../../../../shared/links/url_helpers';
import { getAgentMarks } from '../marks/get_agent_marks';
import { getErrorMarks } from '../marks/get_error_marks';
import { AccordionWaterfall } from './accordion_waterfall';
import { WaterfallFlyout } from './waterfall_flyout';
import { IWaterfall, IWaterfallItem } from './waterfall_helpers/waterfall_helpers';

const Container = euiStyled.div`
  transition: 0.1s padding ease;
  position: relative;
`;

const toggleFlyout = ({
  history,
  item,
  flyoutDetailTab,
}: {
  history: History;
  item?: IWaterfallItem;
  flyoutDetailTab?: string;
}) => {
  history.replace({
    ...history.location,
    search: fromQuery({
      ...toQuery(location.search),
      flyoutDetailTab,
      waterfallItemId: item?.id,
    }),
  });
};

const WaterfallItemsContainer = euiStyled.div<{ euiTheme: EuiThemeComputed }>`
  border-bottom: 1px solid ${({ euiTheme }) => euiTheme.colors.mediumShade};
`;

interface Props {
  waterfallItemId?: string;
  waterfall: IWaterfall;
  showCriticalPath: boolean;
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

export function Waterfall({ waterfall, waterfallItemId, showCriticalPath }: Props) {
  const history = useHistory();
  const theme = useTheme();
  const { euiTheme } = useEuiTheme();
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);

  const { duration } = waterfall;

  const agentMarks = getAgentMarks(waterfall.entryTransaction);
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
          top: var(--euiFixedHeadersOffset, 0);
          z-index: ${theme.eui.euiZLevel2};
          background-color: ${euiTheme.colors.emptyShade};
          border-bottom: 1px solid ${euiTheme.colors.mediumShade};
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
      <WaterfallItemsContainer euiTheme={euiTheme}>
        {!waterfall.entryWaterfallTransaction ? null : (
          <AccordionWaterfall
            isOpen={isAccordionOpen}
            waterfallItemId={waterfallItemId}
            duration={duration}
            waterfall={waterfall}
            timelineMargins={timelineMargins}
            onClickWaterfallItem={(item: IWaterfallItem, flyoutDetailTab: string) =>
              toggleFlyout({ history, item, flyoutDetailTab })
            }
            showCriticalPath={showCriticalPath}
            maxLevelOpen={
              waterfall.traceDocsTotal > 500 ? MAX_DEPTH_OPEN_LIMIT : waterfall.traceDocsTotal
            }
          />
        )}
      </WaterfallItemsContainer>

      <WaterfallFlyout
        waterfallItemId={waterfallItemId}
        waterfall={waterfall}
        toggleFlyout={toggleFlyout}
      />
    </Container>
  );
}
