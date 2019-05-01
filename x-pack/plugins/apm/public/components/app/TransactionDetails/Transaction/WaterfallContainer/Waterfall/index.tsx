/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
// @ts-ignore
import { StickyContainer } from 'react-sticky';
import styled from 'styled-components';
// @ts-ignore
import Timeline from '../../../../../shared/charts/Timeline';
import { fromQuery, toQuery } from '../../../../../shared/Links/url_helpers';
import { history } from '../../../../../../utils/history';
import { AgentMark } from '../get_agent_marks';
import {
  IServiceColors,
  IWaterfall
} from './waterfall_helpers/waterfall_helpers';
import { WaterfallItem } from './WaterfallItem';
import { Flyout } from './Flyout';

const Container = styled.div`
  transition: 0.1s padding ease;
  position: relative;
  overflow: hidden;
`;

const TIMELINE_MARGINS = {
  top: 40,
  left: 50,
  right: 50,
  bottom: 0
};

interface Props {
  agentMarks: AgentMark[];
  waterfall: IWaterfall;
  serviceColors: IServiceColors;
}

export function Waterfall({ agentMarks, waterfall, serviceColors }: Props) {
  const itemContainerHeight = 58; // TODO: This is a nasty way to calculate the height of the svg element. A better approach should be found
  const waterfallHeight = itemContainerHeight * waterfall.orderedItems.length;

  return (
    <Container>
      <StickyContainer>
        <Timeline
          agentMarks={agentMarks}
          duration={waterfall.duration}
          traceRootDuration={waterfall.traceRootDuration}
          height={waterfallHeight}
          margins={TIMELINE_MARGINS}
        />
        <div
          style={{
            paddingTop: TIMELINE_MARGINS.top
          }}
        >
          {waterfall.orderedItems.map(item => {
            const errorCount =
              item.docType === 'transaction'
                ? waterfall.errorCountByTransactionId[
                    item.transaction.transaction.id
                  ]
                : 0;

            return (
              <WaterfallItem
                key={item.id}
                timelineMargins={TIMELINE_MARGINS}
                color={serviceColors[item.serviceName]}
                item={item}
                totalDuration={waterfall.duration}
                errorCount={errorCount}
                onClick={() => {
                  history.replace({
                    ...history.location,
                    search: fromQuery({
                      ...toQuery(history.location.search),
                      flyoutDetailTab: undefined,
                      waterfallItemId: String(item.id)
                    })
                  });
                }}
              />
            );
          })}
        </div>
      </StickyContainer>

      <Flyout
        waterfall={waterfall}
        onClose={() => {
          history.replace({
            ...history.location,
            search: fromQuery({
              ...toQuery(history.location.search),
              flyoutDetailTab: undefined,
              waterfallItemId: undefined
            })
          });
        }}
      />
    </Container>
  );
}
