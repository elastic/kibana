/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { get } from 'lodash';
import { StickyContainer } from 'react-sticky';
import Timeline from '../../../../../shared/charts/Timeline';
import WaterfallItem from './WaterfallItem';
import { SpanFlyout } from './SpanFlyout';
import { TransactionFlyout } from './TransactionFlyout';

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
    currentItem: null
  };

  onOpenFlyout = currentItem => {
    this.setState({ currentItem });
  };

  onCloseFlyout = () => {
    this.setState({ currentItem: null });
  };

  renderWaterfall = item => {
    if (!item) {
      return null;
    }

    const { urlParams, location, serviceColors, waterfall } = this.props;

    return (
      <Fragment key={item.id}>
        <WaterfallItem
          location={location}
          timelineMargins={TIMELINE_MARGINS}
          color={serviceColors[item.serviceName]}
          item={item}
          totalDuration={waterfall.duration}
          isSelected={item.id === urlParams.id} // TODO: urlParams.id is just a dummy
          onClick={() => {
            this.onOpenFlyout(item);
          }}
        />

        {item.children && item.children.map(this.renderWaterfall)}
      </Fragment>
    );
  };

  render() {
    const { currentItem } = this.state;
    const { waterfall } = this.props;
    const itemContainerHeight = 58; // TODO: This is a nasty way to calculate the height of the svg element. A better approach should be found
    const waterfallHeight = itemContainerHeight * waterfall.childrenCount;

    return (
      <Container>
        <StickyContainer>
          <Timeline
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

        {get(currentItem, 'eventType') === 'span' && (
          <SpanFlyout
            totalDuration={waterfall.duration}
            span={currentItem.span}
            onClose={this.onCloseFlyout}
          />
        )}

        {get(currentItem, 'eventType') === 'transaction' && (
          <TransactionFlyout
            totalDuration={waterfall.duration}
            transaction={currentItem.transaction}
            onClose={this.onCloseFlyout}
          />
        )}
      </Container>
    );
  }
}

Waterfall.propTypes = {
  // TODO: the agent marks and note about dropped spans were removed. Need to be re-added
  //   agentMarks: PropTypes.array,
  //   agentName: PropTypes.string.isRequired,
  //   droppedSpans: PropTypes.number.isRequired,

  location: PropTypes.object.isRequired,
  serviceColors: PropTypes.object.isRequired,
  urlParams: PropTypes.object.isRequired,
  waterfall: PropTypes.object.isRequired
};

export default Waterfall;
