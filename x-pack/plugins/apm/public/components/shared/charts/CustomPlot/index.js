/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, flatten } from 'lodash';
import { makeWidthFlexible } from 'react-vis';
import PropTypes from 'prop-types';
import React, { PureComponent, Fragment } from 'react';

import Legends from './Legends';
import StaticPlot from './StaticPlot';
import InteractivePlot from './InteractivePlot';
import VoronoiPlot from './VoronoiPlot';
import { AnnotationsPlot } from './AnnotationsPlot';
import { createSelector } from 'reselect';
import { getPlotValues } from './plotUtils';
import { isValidCoordinateValue } from '../../../../utils/isValidCoordinateValue';

const VISIBLE_LEGEND_COUNT = 4;

function getHiddenLegendCount(series) {
  return series.filter((serie) => serie.hideLegend).length;
}

export class InnerCustomPlot extends PureComponent {
  state = {
    seriesEnabledState: [],
    isDrawing: false,
    selectionStart: null,
    selectionEnd: null,
    showAnnotations: true,
  };

  getEnabledSeries = createSelector(
    (state) => state.visibleSeries,
    (state) => state.seriesEnabledState,
    (visibleSeries, seriesEnabledState) =>
      visibleSeries.filter((serie, i) => !seriesEnabledState[i])
  );

  getOptions = createSelector(
    (state) => state.width,
    (state) => state.yMin,
    (state) => state.yMax,
    (state) => state.height,
    (state) => state.stackBy,
    (width, yMin, yMax, height, stackBy) => ({
      width,
      yMin,
      yMax,
      height,
      stackBy,
    })
  );

  getPlotValues = createSelector(
    (state) => state.visibleSeries,
    (state) => state.enabledSeries,
    (state) => state.options,
    getPlotValues
  );

  getVisibleSeries = createSelector(
    (state) => state.series,
    (series) => {
      return series.slice(
        0,
        VISIBLE_LEGEND_COUNT + getHiddenLegendCount(series)
      );
    }
  );

  clickLegend = (i) => {
    this.setState(({ seriesEnabledState }) => {
      const nextSeriesEnabledState = this.props.series.map((value, _i) => {
        const disabledValue = seriesEnabledState[_i];
        return i === _i ? !disabledValue : !!disabledValue;
      });

      if (typeof this.props.onToggleLegend === 'function') {
        this.props.onToggleLegend(nextSeriesEnabledState);
      }

      return {
        seriesEnabledState: nextSeriesEnabledState,
      };
    });
  };

  onMouseLeave = (...args) => {
    this.props.onMouseLeave(...args);
  };

  onMouseDown = (node) =>
    this.setState({
      isDrawing: true,
      selectionStart: node.x,
      selectionEnd: null,
    });

  onMouseUp = () => {
    if (this.state.isDrawing && this.state.selectionEnd !== null) {
      const [start, end] = [
        this.state.selectionStart,
        this.state.selectionEnd,
      ].sort();
      this.props.onSelectionEnd({ start, end });
    }
    this.setState({ isDrawing: false });
  };

  onHover = (node) => {
    this.props.onHover(node.x);

    if (this.state.isDrawing) {
      this.setState({ selectionEnd: node.x });
    }
  };

  componentDidMount() {
    document.body.addEventListener('mouseup', this.onMouseUp);
  }

  componentWillUnmount() {
    document.body.removeEventListener('mouseup', this.onMouseUp);
  }

  render() {
    const { series, truncateLegends, width, annotations } = this.props;

    if (!width) {
      return null;
    }

    const hiddenSeriesCount = Math.max(
      series.length - VISIBLE_LEGEND_COUNT - getHiddenLegendCount(series),
      0
    );
    const visibleSeries = this.getVisibleSeries({ series });
    const enabledSeries = this.getEnabledSeries({
      visibleSeries,
      seriesEnabledState: this.state.seriesEnabledState,
    });
    const options = this.getOptions(this.props);

    const hasValidCoordinates = flatten(series.map((s) => s.data)).some((p) =>
      isValidCoordinateValue(p.y)
    );
    const noHits = this.props.noHits || !hasValidCoordinates;

    const plotValues = this.getPlotValues({
      visibleSeries,
      enabledSeries: enabledSeries,
      options,
    });

    if (isEmpty(plotValues)) {
      return null;
    }

    return (
      <Fragment>
        <div style={{ position: 'relative', height: plotValues.XY_HEIGHT }}>
          <StaticPlot
            width={width}
            noHits={noHits}
            plotValues={plotValues}
            series={enabledSeries}
            tickFormatY={this.props.tickFormatY}
            tickFormatX={this.props.tickFormatX}
          />

          {this.state.showAnnotations && !isEmpty(annotations) && !noHits && (
            <AnnotationsPlot
              plotValues={plotValues}
              width={width}
              annotations={annotations || []}
            />
          )}

          <InteractivePlot
            plotValues={plotValues}
            hoverX={this.props.hoverX}
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
          />
        </div>
        <Legends
          noHits={noHits}
          truncateLegends={truncateLegends}
          series={visibleSeries}
          hiddenSeriesCount={hiddenSeriesCount}
          clickLegend={this.clickLegend}
          seriesEnabledState={this.state.seriesEnabledState}
          hasAnnotations={!isEmpty(annotations) && !noHits}
          showAnnotations={this.state.showAnnotations}
          onAnnotationsToggle={() => {
            this.setState(({ showAnnotations }) => ({
              showAnnotations: !showAnnotations,
            }));
          }}
        />
      </Fragment>
    );
  }
}

InnerCustomPlot.propTypes = {
  formatTooltipValue: PropTypes.func,
  hoverX: PropTypes.number,
  onHover: PropTypes.func.isRequired,
  onMouseLeave: PropTypes.func.isRequired,
  onSelectionEnd: PropTypes.func.isRequired,
  series: PropTypes.array.isRequired,
  tickFormatY: PropTypes.func,
  truncateLegends: PropTypes.bool,
  width: PropTypes.number.isRequired,
  height: PropTypes.number,
  stackBy: PropTypes.string,
  annotations: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string,
      id: PropTypes.string,
      firstSeen: PropTypes.number,
    })
  ),
  noHits: PropTypes.bool,
  onToggleLegend: PropTypes.func,
};

InnerCustomPlot.defaultProps = {
  formatTooltipValue: (p) => p.y,
  tickFormatX: undefined,
  tickFormatY: (y) => y,
  truncateLegends: false,
  xAxisTickSizeOuter: 0,
  noHits: false,
};

export default makeWidthFlexible(InnerCustomPlot);
