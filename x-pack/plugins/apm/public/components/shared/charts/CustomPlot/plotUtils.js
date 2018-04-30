/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { scaleLinear } from 'd3-scale';
import { XYPlot } from 'react-vis';
import d3 from 'd3';
import PropTypes from 'prop-types';
import React from 'react';

import { unit } from '../../../../style/variables';

const XY_HEIGHT = unit * 16;
const XY_MARGIN = {
  top: unit,
  left: unit * 5,
  right: unit,
  bottom: unit * 2
};

const getXScale = (xMin, xMax, width) => {
  return scaleLinear()
    .domain([xMin, xMax])
    .range([XY_MARGIN.left, width - XY_MARGIN.right]);
};

const getYScale = (yMin, yMax) => {
  return scaleLinear()
    .domain([yMin, yMax])
    .range([XY_HEIGHT, 0])
    .nice();
};

function getFlattenedCoordiantes(visibleSeries, enabledSeries) {
  const enabledCoordinates = _.flatten(enabledSeries.map(serie => serie.data));
  if (!_.isEmpty(enabledCoordinates)) {
    return enabledCoordinates;
  }

  return _.flatten(visibleSeries.map(serie => serie.data));
}

export function getPlotValues(visibleSeries, enabledSeries, width) {
  const flattenedCoordinates = getFlattenedCoordiantes(
    visibleSeries,
    enabledSeries
  );
  if (_.isEmpty(flattenedCoordinates)) {
    return null;
  }

  const xMin = d3.min(flattenedCoordinates, d => d.x);
  const xMax = d3.max(flattenedCoordinates, d => d.x);
  const yMin = 0;
  const yMax = d3.max(flattenedCoordinates, d => d.y) || 1;
  const xScale = getXScale(xMin, xMax, width);
  const yScale = getYScale(yMin, yMax);

  const yMaxNice = yScale.domain()[1];
  const yTickValues = [0, yMaxNice / 2, yMaxNice];

  return {
    x: xScale,
    y: yScale,
    yTickValues,
    XY_MARGIN,
    XY_HEIGHT,
    XY_WIDTH: width
  };
}

export function SharedPlot({ plotValues, ...props }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0 }}>
      <XYPlot
        dontCheckIfEmpty
        height={XY_HEIGHT}
        margin={XY_MARGIN}
        xType="time"
        width={plotValues.XY_WIDTH}
        xDomain={plotValues.x.domain()}
        yDomain={plotValues.y.domain()}
        {...props}
      />
    </div>
  );
}

SharedPlot.propTypes = {
  plotValues: PropTypes.shape({
    x: PropTypes.func.isRequired,
    y: PropTypes.func.isRequired,
    XY_WIDTH: PropTypes.number.isRequired
  }).isRequired
};
