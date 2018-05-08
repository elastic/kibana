/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { makeWidthFlexible } from 'react-vis';
import PropTypes from 'prop-types';
import React, { PureComponent, Fragment } from 'react';
import styled from 'styled-components';

import Legends from './Legends';
import StaticPlot from './StaticPlot';
import InteractivePlot from './InteractivePlot';
import VoronoiPlot from './VoronoiPlot';
import { createSelector } from 'reselect';
import { getPlotValues } from './plotUtils';
import { fontSizes, units, px } from '../../../../style/variables';

const Title = styled.div`
  font-size: ${fontSizes.large};
  margin-bottom: ${px(units.half)};
`;

const VISIBLE_SERIES_COUNT = 4;

export class InnerCustomPlot extends PureComponent {
  state = {
    seriesEnabledState: [],
    isDrawing: false,
    selectionStart: null,
    selectionEnd: null
  };

  getEnabledSeries = createSelector(
    state => state.visibleSeries,
    state => state.seriesEnabledState,
    (visibleSeries, seriesEnabledState) =>
      visibleSeries.filter((serie, i) => !seriesEnabledState[i])
  );

  getPlotValues = createSelector(
    state => state.visibleSeries,
    state => state.enabledSeries,
    state => state.width,
    getPlotValues
  );

  getVisibleSeries = createSelector(
    state => state.series,
    series => series.slice(0, VISIBLE_SERIES_COUNT)
  );

  clickLegend = i => {
    this.setState(({ seriesEnabledState }) => {
      const nextSeriesEnabledState = this.props.series.map((value, _i) => {
        const disabledValue = seriesEnabledState[_i];
        return i === _i ? !disabledValue : !!disabledValue;
      });

      return {
        seriesEnabledState: nextSeriesEnabledState
      };
    });
  };

  onMouseLeave = (...args) => {
    if (this.state.isDrawing) {
      this.setState({ isDrawing: false });
    }
    this.props.onMouseLeave(...args);
  };

  onMouseDown = node =>
    this.setState({
      isDrawing: true,
      selectionStart: node.x,
      selectionEnd: null
    });

  onMouseUp = () => {
    if (this.state.selectionEnd !== null) {
      const [start, end] = [
        this.state.selectionStart,
        this.state.selectionEnd
      ].sort();
      this.props.onSelectionEnd({ start, end });
    }
    this.setState({ isDrawing: false });
  };

  onHover = node => {
    const index = this.props.series[0].data.findIndex(
      item => item.x === node.x
    );
    this.props.onHover(index);

    if (this.state.isDrawing) {
      this.setState({ selectionEnd: node.x });
    }
  };

  render() {
    const { chartTitle, series, truncateLegends, noHits, width } = this.props;

    if (_.isEmpty(series) || !width) {
      return null;
    }

    const hiddenSeriesCount = Math.max(series.length - VISIBLE_SERIES_COUNT, 0);
    const visibleSeries = this.getVisibleSeries({ series });
    const enabledSeries = this.getEnabledSeries({
      visibleSeries,
      seriesEnabledState: this.state.seriesEnabledState
    });

    const plotValues = this.getPlotValues({
      visibleSeries,
      enabledSeries,
      width
    });
    if (_.isEmpty(plotValues)) {
      return null;
    }

    return (
      <Fragment>
        <Title>{chartTitle}</Title>

        <Legends
          noHits={noHits}
          chartTitle={chartTitle}
          truncateLegends={truncateLegends}
          series={visibleSeries}
          hiddenSeriesCount={hiddenSeriesCount}
          clickLegend={this.clickLegend}
          seriesEnabledState={this.state.seriesEnabledState}
        />

        <div style={{ position: 'relative', height: plotValues.XY_HEIGHT }}>
          <StaticPlot
            noHits={noHits}
            plotValues={plotValues}
            series={enabledSeries}
            tickFormatY={this.props.tickFormatY}
            tickFormatX={this.props.tickFormatX}
          />

          <InteractivePlot
            plotValues={plotValues}
            hoverIndex={this.props.hoverIndex}
            series={enabledSeries}
            formatTooltipValue={this.props.formatTooltipValue}
            isDrawing={this.state.isDrawing}
            selectionStart={this.state.selectionStart}
            selectionEnd={this.state.selectionEnd}
          />

          <VoronoiPlot
            noHits={noHits}
            plotValues={plotValues}
            series={enabledSeries}
            onHover={this.onHover}
            onMouseLeave={this.onMouseLeave}
            onMouseDown={this.onMouseDown}
            onMouseUp={this.onMouseUp}
          />
        </div>
      </Fragment>
    );
  }
}

InnerCustomPlot.propTypes = {
  formatTooltipValue: PropTypes.func,
  hoverIndex: PropTypes.number,
  noHits: PropTypes.bool.isRequired,
  onHover: PropTypes.func.isRequired,
  onMouseLeave: PropTypes.func.isRequired,
  onSelectionEnd: PropTypes.func.isRequired,
  series: PropTypes.array.isRequired,
  tickFormatY: PropTypes.func,
  truncateLegends: PropTypes.bool,
  width: PropTypes.number.isRequired
};

InnerCustomPlot.defaultProps = {
  formatTooltipValue: y => y,
  tickFormatY: y => y,
  truncateLegends: false
};

export default makeWidthFlexible(InnerCustomPlot);
