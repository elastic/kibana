/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { get } from 'lodash';
import { StickyContainer } from 'react-sticky';
import Timeline from '../../../../shared/charts/Timeline';
import WaterfallItem from './WaterfallItem';
import TransactionFlyout from './TransactionFlyout';
import SpanFlyout from './SpanFlyout';

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

class Waterfall extends Component {
  state = {
    isFlyoutOpen: false
  };

  onOpenFlyout = activeItem => {
    this.setState({ activeItem, isFlyoutOpen: true });
  };

  onCloseFlyout = () => {
    this.setState({ isFlyoutOpen: false });
  };

  render() {
    const {
      urlParams,
      location,
      trace,
      waterfallItems,
      serviceColors
    } = this.props;
    const totalDuration = trace.duration;
    const itemContainerHeight = 58; // TODO: This is a nasty way to calculate the height of the svg element. A better approach should be found
    const waterfallHeight = itemContainerHeight * waterfallItems.length;
    const activeItemDoc = get(this.state.activeItem, 'doc');
    const activeItemEvent = get(this.state.activeItem, 'processor.event');

    return (
      <Container>
        <StickyContainer>
          <Timeline
            duration={totalDuration}
            height={waterfallHeight}
            margins={TIMELINE_MARGINS}
          />
          <div
            style={{
              paddingTop: TIMELINE_MARGINS.top
            }}
          >
            {waterfallItems.map(waterfallItem => (
              <WaterfallItem
                location={location}
                timelineMargins={TIMELINE_MARGINS}
                key={waterfallItem.id}
                color={serviceColors[waterfallItem.service]}
                waterfallItem={waterfallItem}
                totalDuration={totalDuration}
                isSelected={waterfallItem.id === urlParams.id} // TODO: urlParams.id is just a dummy
                onClick={this.onOpenFlyout}
              />
            ))}
          </div>
        </StickyContainer>

        {activeItemEvent === 'transaction' && (
          <TransactionFlyout
            transaction={activeItemDoc}
            urlParams={urlParams}
            location={location}
            isOpen={this.state.isFlyoutOpen}
            onClose={this.onCloseFlyout}
          />
        )}

        {activeItemEvent === 'span' && (
          <SpanFlyout
            totalDuration={10000} // TODO: this should not be hardcoded
            span={activeItemDoc}
            isOpen={this.state.isFlyoutOpen}
            onClose={this.onCloseFlyout}
          />
        )}
      </Container>
    );
  }
}

Waterfall.propTypes = {
  //   agentMarks: PropTypes.array,
  //   agentName: PropTypes.string.isRequired,
  //   droppedSpans: PropTypes.number.isRequired,

  location: PropTypes.object.isRequired,
  serviceColors: PropTypes.object.isRequired,
  trace: PropTypes.object.isRequired,
  urlParams: PropTypes.object.isRequired,
  waterfallItems: PropTypes.array.isRequired
};

export default Waterfall;
