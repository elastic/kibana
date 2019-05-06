/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import React, { Component } from 'react';
// @ts-ignore
import { StickyContainer } from 'react-sticky';
import styled from 'styled-components';
import { IUrlParams } from '../../../../../../context/UrlParamsContext/types';
// @ts-ignore
import Timeline from '../../../../../shared/charts/Timeline';
import {
  APMQueryParams,
  fromQuery,
  toQuery
} from '../../../../../shared/Links/url_helpers';
import { history } from '../../../../../../utils/history';
import { AgentMark } from '../get_agent_marks';
import { SpanFlyout } from './SpanFlyout';
import { TransactionFlyout } from './TransactionFlyout';
import {
  IServiceColors,
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
  location: Location;
  serviceColors: IServiceColors;
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

  public renderWaterfallItem = (item: IWaterfallItem) => {
    const { serviceColors, waterfall, urlParams }: Props = this.props;

    const errorCount =
      item.docType === 'transaction'
        ? waterfall.errorCountByTransactionId[item.transaction.transaction.id]
        : 0;

    return (
      <WaterfallItem
        key={item.id}
        timelineMargins={TIMELINE_MARGINS}
        color={serviceColors[item.serviceName]}
        item={item}
        totalDuration={waterfall.duration}
        isSelected={item.id === urlParams.waterfallItemId}
        errorCount={errorCount}
        onClick={() => this.onOpenFlyout(item)}
      />
    );
  };

  public getFlyOut = () => {
    const { waterfall, urlParams } = this.props;

    const currentItem =
      urlParams.waterfallItemId &&
      waterfall.itemsById[urlParams.waterfallItemId];

    if (!currentItem) {
      return null;
    }

    switch (currentItem.docType) {
      case 'span':
        const parentTransaction = waterfall.getTransactionById(
          currentItem.parentId
        );

        return (
          <SpanFlyout
            totalDuration={waterfall.duration}
            span={currentItem.span}
            parentTransaction={parentTransaction}
            onClose={this.onCloseFlyout}
          />
        );
      case 'transaction':
        return (
          <TransactionFlyout
            transaction={currentItem.transaction}
            onClose={this.onCloseFlyout}
            traceRootDuration={waterfall.traceRootDuration}
            errorCount={currentItem.errorCount}
          />
        );
      default:
        return null;
    }
  };

  public render() {
    const { waterfall } = this.props;
    const itemContainerHeight = 58; // TODO: This is a nasty way to calculate the height of the svg element. A better approach should be found
    const waterfallHeight = itemContainerHeight * waterfall.orderedItems.length;

    return (
      <Container>
        <StickyContainer>
          <Timeline
            agentMarks={this.props.agentMarks}
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
            {waterfall.orderedItems.map(this.renderWaterfallItem)}
          </div>
        </StickyContainer>

        {this.getFlyOut()}
      </Container>
    );
  }

  private setQueryParams(params: APMQueryParams) {
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
