/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { SharedPlot } from './plotUtils';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import SelectionMarker from './SelectionMarker';

import { MarkSeries, VerticalGridLines } from 'react-vis';
import Tooltip from '../Tooltip';

class InteractivePlot extends PureComponent {
  getMarkPoints = hoverIndex => {
    if (!this.props.series[0].data[hoverIndex]) {
      return [];
    }

    return this.props.series.map(serie => {
      const { x, y } = serie.data[hoverIndex] || {};
      return {
        x,
        y,
        color: serie.color
      };
    });
  };

  getTooltipPoints = hoverIndex => {
    if (!this.props.series[0].data[hoverIndex]) {
      return [];
    }

    return this.props.series.map(serie => ({
      color: serie.color,
      value: this.props.formatTooltipValue(_.get(serie.data[hoverIndex], 'y')),
      text: serie.titleShort || serie.title
    }));
  };

  getHoveredX = hoverIndex => {
    const defaultSerie = this.props.series[0].data;
    return _.get(defaultSerie[hoverIndex], 'x');
  };

  render() {
    const {
      plotValues,
      hoverIndex,
      series,
      isDrawing,
      selectionStart,
      selectionEnd
    } = this.props;

    if (_.isEmpty(series)) {
      return null;
    }

    const tooltipPoints = this.getTooltipPoints(hoverIndex);
    const markPoints = this.getMarkPoints(hoverIndex);
    const hoveredX = this.getHoveredX(hoverIndex);
    const { x, yTickValues } = plotValues;
    const yValueMiddle = yTickValues[1];

    return (
      <SharedPlot plotValues={plotValues}>
        {hoveredX && (
          <Tooltip
            tooltipPoints={tooltipPoints}
            x={hoveredX}
            y={yValueMiddle}
          />
        )}

        {hoveredX && <MarkSeries data={markPoints} colorType="literal" />}
        {hoveredX && <VerticalGridLines tickValues={[hoveredX]} />}

        {isDrawing &&
          selectionEnd !== null && (
            <SelectionMarker start={x(selectionStart)} end={x(selectionEnd)} />
          )}
      </SharedPlot>
    );
  }
}

InteractivePlot.propTypes = {
  formatTooltipValue: PropTypes.func.isRequired,
  hoverIndex: PropTypes.number,
  isDrawing: PropTypes.bool.isRequired,
  plotValues: PropTypes.object.isRequired,
  selectionEnd: PropTypes.number,
  selectionStart: PropTypes.number,
  series: PropTypes.array.isRequired
};

export default InteractivePlot;
