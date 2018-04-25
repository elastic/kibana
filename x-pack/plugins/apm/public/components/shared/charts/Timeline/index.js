/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { makeWidthFlexible } from 'react-vis';
import { createSelector } from 'reselect';
import { getPlotValues } from './plotUtils';
import TimelineAxis from './TimelineAxis';
import VerticalLines from './VerticalLines';

class Timeline extends PureComponent {
  getPlotValues = createSelector(
    state => state.duration,
    state => state.height,
    state => state.margins,
    state => state.width,
    getPlotValues
  );

  render() {
    const { width, duration, header } = this.props;

    if (duration == null || !width) {
      return null;
    }

    const plotValues = this.getPlotValues(this.props);

    return (
      <div>
        <TimelineAxis plotValues={plotValues} header={header} />
        <VerticalLines plotValues={plotValues} />
      </div>
    );
  }
}

Timeline.propTypes = {
  duration: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  header: PropTypes.node,
  margins: PropTypes.object.isRequired,
  width: PropTypes.number
};

export default makeWidthFlexible(Timeline);
