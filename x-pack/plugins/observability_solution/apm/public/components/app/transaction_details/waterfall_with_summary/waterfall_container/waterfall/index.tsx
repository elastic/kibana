/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { History } from 'history';
import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { Timeline } from '../../../../../shared/charts/timeline';
import { fromQuery, toQuery } from '../../../../../shared/links/url_helpers';
import { getAgentMarks } from '../marks/get_agent_marks';
import { getErrorMarks } from '../marks/get_error_marks';
import { AccordionWaterfall } from './accordion_waterfall';
import { WaterfallFlyout } from './waterfall_flyout';
import {
  IWaterfall,
  IWaterfallItem,
} from './waterfall_helpers/waterfall_helpers';

const Container = euiStyled.div`
  transition: 0.1s padding ease;
  position: relative;
  overflow: hidden;
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

const WaterfallItemsContainer = euiStyled.div`
  border-bottom: 1px solid ${({ theme }) => theme.eui.euiColorMediumShade};
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
  function countLevels(id: string, currentLevel: number) {
    const children = waterfall.childrenByParentId[id] || [];
    if (children.length) {
      children.forEach((child) => {
        // Skip processing when a child node has the same ID as its parent
        // to prevent infinite loop
        if (child.id !== id) {
          countLevels(child.id, currentLevel + 1);
        }
      });
    } else {
      if (maxLevel < currentLevel) {
        maxLevel = currentLevel;
      }
    }
  }

  countLevels(entryId, 1);
  return maxLevel;
}
// level starts with 0
const maxLevelOpen = 2;

export function Waterfall({
  waterfall,
  waterfallItemId,
  showCriticalPath,
}: Props) {
  const history = useHistory();
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);
  const itemContainerHeight = 58; // TODO: This is a nasty way to calculate the height of the svg element. A better approach should be found
  const waterfallHeight = itemContainerHeight * waterfall.items.length;

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
      <div>
        <div style={{ display: 'flex' }}>
          <EuiButtonEmpty
            data-test-subj="apmWaterfallButton"
            style={{ zIndex: 3, position: 'absolute' }}
            iconType={isAccordionOpen ? 'fold' : 'unfold'}
            onClick={() => {
              setIsAccordionOpen((isOpen) => !isOpen);
            }}
          />
          <Timeline
            marks={[...agentMarks, ...errorMarks]}
            xMax={duration}
            height={waterfallHeight}
            margins={timelineMargins}
          />
        </div>
        <WaterfallItemsContainer>
          {!waterfall.entryWaterfallTransaction ? null : (
            <AccordionWaterfall
              // used to recreate the entire tree when `isAccordionOpen` changes, collapsing or expanding all elements.
              key={`accordion_state_${isAccordionOpen}`}
              isOpen={isAccordionOpen}
              item={waterfall.entryWaterfallTransaction}
              level={0}
              waterfallItemId={waterfallItemId}
              duration={duration}
              waterfall={waterfall}
              timelineMargins={timelineMargins}
              onClickWaterfallItem={(
                item: IWaterfallItem,
                flyoutDetailTab: string
              ) => toggleFlyout({ history, item, flyoutDetailTab })}
              showCriticalPath={showCriticalPath}
              maxLevelOpen={
                waterfall.traceDocsTotal > 500
                  ? maxLevelOpen
                  : waterfall.traceDocsTotal
              }
            />
          )}
        </WaterfallItemsContainer>
      </div>

      <WaterfallFlyout
        waterfallItemId={waterfallItemId}
        waterfall={waterfall}
        toggleFlyout={toggleFlyout}
      />
    </Container>
  );
}
