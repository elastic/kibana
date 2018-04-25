/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  XAxis,
  YAxis,
  HorizontalGridLines,
  LineSeries,
  AreaSeries
} from 'react-vis';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';

import StatusText from './StatusText';
import { SharedPlot } from './plotUtils';

const X_TICK_TOTAL = 7;
class StaticPlot extends PureComponent {
  getSerie(serie) {
    switch (serie.type) {
      case 'line':
        return (
          <LineSeries
            getNull={d => d.y !== null}
            key={serie.title}
            xType="time"
            curve={'curveMonotoneX'}
            data={serie.data}
            color={serie.color}
          />
        );
      case 'area':
        return (
          <AreaSeries
            getNull={d => d.y !== null}
            key={serie.title}
            xType="time"
            curve={'curveMonotoneX'}
            data={serie.data}
            color={serie.color}
            stroke={serie.color}
            fill={serie.areaColor}
          />
        );
      default:
        throw new Error(`Unknown type ${serie.type}`);
    }
  }

  render() {
    const { series, tickFormatX, tickFormatY, plotValues, noHits } = this.props;
    const { yTickValues } = plotValues;

    return (
      <SharedPlot plotValues={plotValues}>
        <HorizontalGridLines tickValues={yTickValues} />
        <XAxis tickSize={0} tickTotal={X_TICK_TOTAL} tickFormat={tickFormatX} />
        <YAxis tickSize={0} tickValues={yTickValues} tickFormat={tickFormatY} />

        {noHits ? (
          <StatusText text="No data within this time range." />
        ) : (
          series
            .slice()
            .reverse()
            .map(this.getSerie)
        )}
      </SharedPlot>
    );
  }
}

export default StaticPlot;

StaticPlot.propTypes = {
  noHits: PropTypes.bool.isRequired,
  series: PropTypes.array.isRequired,
  plotValues: PropTypes.object.isRequired,
  tickFormatX: PropTypes.func,
  tickFormatY: PropTypes.func.isRequired
};
