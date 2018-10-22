/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
// @ts-ignore
import { StickyContainer } from 'react-sticky';
import styled from 'styled-components';

import { IUrlParams } from '../../../../../../store/urlParams';

// @ts-ignore
import { fromQuery, history, toQuery } from '../../../../../../utils/url';
// @ts-ignore
import Timeline from '../../../../../shared/charts/Timeline';
import { AgentMark } from '../get_agent_marks';
import { SpanFlyout } from './SpanFlyout';
import { TransactionFlyout } from './TransactionFlyout';
import {
  IWaterfall,
  IWaterfallItem
} from './waterfall_helpers/waterfall_helpers';
import { WaterfallItem } from './WaterfallItem';

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
  urlParams: IUrlParams;
  waterfall: IWaterfall;
  location: any;
  serviceColors: {
    [key: string]: string;
  };
}

export class Waterfall extends Component<Props> {
  public onOpenFlyout = (item: IWaterfallItem) => {
    this.setQueryParams({
      flyoutDetailTab: undefined,
      waterfallItemId: String(item.id)
    });
  };

  public onCloseFlyout = () => {
    this.setQueryParams({
      flyoutDetailTab: undefined,
      waterfallItemId: undefined
    });
  };

  public renderWaterfall = (item?: IWaterfallItem) => {
    if (!item) {
      return null;
    }

    const { serviceColors, waterfall, urlParams }: Props = this.props;

    return (
      <Fragment key={item.id}>
        <WaterfallItem
          timelineMargins={TIMELINE_MARGINS}
          color={serviceColors[item.serviceName]}
          item={item}
          totalDuration={waterfall.duration}
          isSelected={item.id === urlParams.waterfallItemId}
          onClick={() => this.onOpenFlyout(item)}
        />

        {item.children && item.children.map(this.renderWaterfall)}
      </Fragment>
    );
  };

  public getFlyOut = () => {
    const { waterfall, location, urlParams } = this.props;

    const currentItem =
      urlParams.waterfallItemId &&
      waterfall.itemsById[urlParams.waterfallItemId];

    if (!currentItem) {
      return null;
    }

    switch (currentItem.docType) {
      case 'span':
        return (
          <SpanFlyout
            totalDuration={waterfall.duration}
            span={currentItem.span}
            parentTransaction={currentItem.parentTransaction}
            onClose={this.onCloseFlyout}
          />
        );
      case 'transaction':
        return (
          <TransactionFlyout
            transaction={currentItem.transaction}
            onClose={this.onCloseFlyout}
            location={location}
            urlParams={urlParams}
            waterfall={waterfall}
          />
        );
      default:
        return null;
    }
  };

  public render() {
    const { waterfall } = this.props;
    const itemContainerHeight = 58; // TODO: This is a nasty way to calculate the height of the svg element. A better approach should be found
    const waterfallHeight = itemContainerHeight * waterfall.childrenCount;

    return (
      <Container>
        <StickyContainer>
          <Timeline
            agentMarks={this.props.agentMarks}
            duration={waterfall.duration}
            height={waterfallHeight}
            margins={TIMELINE_MARGINS}
          />
          <div
            style={{
              paddingTop: TIMELINE_MARGINS.top
            }}
          >
            {this.renderWaterfall(waterfall.root)}
          </div>
        </StickyContainer>

        {this.getFlyOut()}
      </Container>
    );
  }

  private setQueryParams(params: Partial<IUrlParams>) {
    const { location } = this.props;
    history.replace({
      ...location,
      search: fromQuery({
        ...toQuery(location.search),
        ...params
      })
    });
  }
}

// TODO: the agent marks and note about dropped spans were removed. Need to be re-added
//   agentMarks: PropTypes.array,
//   agentName: PropTypes.string.isRequired,
//   droppedSpans: PropTypes.number.isRequired,
