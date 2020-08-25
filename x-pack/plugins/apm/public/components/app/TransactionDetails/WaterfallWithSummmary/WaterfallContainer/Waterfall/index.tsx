/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { History, Location } from 'history';
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
// @ts-ignore
import { StickyContainer } from 'react-sticky';
import styled from 'styled-components';
import { px } from '../../../../../../style/variables';
import { Timeline } from '../../../../../shared/charts/Timeline';
import { HeightRetainer } from '../../../../../shared/HeightRetainer';
import { fromQuery, toQuery } from '../../../../../shared/Links/url_helpers';
import { getAgentMarks } from '../Marks/get_agent_marks';
import { getErrorMarks } from '../Marks/get_error_marks';
import { AccordionWaterfall } from './accordion_waterfall';
import { WaterfallFlyout } from './WaterfallFlyout';
import {
  IWaterfall,
  IWaterfallItem,
} from './waterfall_helpers/waterfall_helpers';

const Container = styled.div`
  transition: 0.1s padding ease;
  position: relative;
  overflow: hidden;
`;

const TIMELINE_MARGINS = {
  top: 40,
  left: 100,
  right: 50,
  bottom: 0,
};

const toggleFlyout = ({
  history,
  item,
  location,
}: {
  history: History;
  item?: IWaterfallItem;
  location: Location;
}) => {
  history.replace({
    ...location,
    search: fromQuery({
      ...toQuery(location.search),
      flyoutDetailTab: undefined,
      waterfallItemId: item?.id,
    }),
  });
};

const WaterfallItemsContainer = styled.div<{
  paddingTop: number;
}>`
  padding-top: ${(props) => px(props.paddingTop)};
  border-bottom: 1px solid ${({ theme }) => theme.eui.euiColorMediumShade};
`;

interface Props {
  waterfallItemId?: string;
  waterfall: IWaterfall;
  location: Location;
  exceedsMax: boolean;
}
export function Waterfall({
  waterfall,
  exceedsMax,
  waterfallItemId,
  location,
}: Props) {
  const history = useHistory();
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);
  const itemContainerHeight = 58; // TODO: This is a nasty way to calculate the height of the svg element. A better approach should be found
  const waterfallHeight = itemContainerHeight * waterfall.items.length;

  const { serviceColors, duration } = waterfall;

  const agentMarks = getAgentMarks(waterfall.entryWaterfallTransaction?.doc);
  const errorMarks = getErrorMarks(waterfall.errorItems, serviceColors);

  function renderItems(
    childrenByParentId: Record<string | number, IWaterfallItem[]>
  ) {
    const { entryWaterfallTransaction } = waterfall;
    if (!entryWaterfallTransaction) {
      return null;
    }
    return (
      <AccordionWaterfall
        // used to recreate the entire tree when `isAccordionOpen` changes, collapsing or expanding all elements.
        key={`accordion_state_${isAccordionOpen}`}
        isOpen={isAccordionOpen}
        item={entryWaterfallTransaction}
        level={0}
        serviceColors={serviceColors}
        waterfallItemId={waterfallItemId}
        location={location}
        errorsPerTransaction={waterfall.errorsPerTransaction}
        duration={duration}
        childrenByParentId={childrenByParentId}
        timelineMargins={TIMELINE_MARGINS}
        onClickWaterfallItem={(item: IWaterfallItem) =>
          toggleFlyout({ history, item, location })
        }
      />
    );
  }

  return (
    <HeightRetainer>
      <Container>
        {exceedsMax && (
          <EuiCallOut
            color="warning"
            size="s"
            iconType="alert"
            title={i18n.translate('xpack.apm.waterfall.exceedsMax', {
              defaultMessage:
                'Number of items in this trace exceed what is displayed',
            })}
          />
        )}
        <StickyContainer>
          <div style={{ display: 'flex' }}>
            <EuiButtonEmpty
              style={{ zIndex: 3, position: 'absolute' }}
              iconType={isAccordionOpen ? 'arrowDown' : 'arrowRight'}
              onClick={() => {
                setIsAccordionOpen((isOpen) => !isOpen);
              }}
            />
            <Timeline
              marks={[...agentMarks, ...errorMarks]}
              xMax={duration}
              height={waterfallHeight}
              margins={TIMELINE_MARGINS}
            />
          </div>
          <WaterfallItemsContainer paddingTop={TIMELINE_MARGINS.top}>
            {renderItems(waterfall.childrenByParentId)}
          </WaterfallItemsContainer>
        </StickyContainer>

        <WaterfallFlyout
          waterfallItemId={waterfallItemId}
          waterfall={waterfall}
          location={location}
          toggleFlyout={toggleFlyout}
        />
      </Container>
    </HeightRetainer>
  );
}
