/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import d3 from 'd3';
import { isEmpty } from 'lodash';
import PropTypes from 'prop-types';
import { scaleLinear } from 'd3-scale';
import styled from 'styled-components';
import SingleRect from './SingleRect';
import {
  XYPlot,
  XAxis,
  YAxis,
  HorizontalGridLines,
  VerticalRectSeries,
  Voronoi,
  makeWidthFlexible,
  VerticalGridLines,
} from 'react-vis';
import { unit } from '../../../../style/variables';
import Tooltip from '../Tooltip';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { tint } from 'polished';
import { getTimeTicksTZ, getDomainTZ } from '../helper/timezone';
import Legends from '../CustomPlot/Legends';
import StatusText from '../CustomPlot/StatusText';
import { i18n } from '@kbn/i18n';
import { isValidCoordinateValue } from '../../../../utils/isValidCoordinateValue';

const XY_HEIGHT = unit * 10;
const XY_MARGIN = {
  top: unit,
  left: unit * 5,
  right: unit,
  bottom: unit * 2,
};

const X_TICK_TOTAL = 8;

// position absolutely to make sure that window resizing/zooming works
const ChartsWrapper = styled.div`
  user-select: none;
  position: absolute;
  top: 0;
  left: 0;
`;

export class HistogramInner extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      hoveredBucket: {},
    };
  }

  onClick = (bucket) => {
    if (this.props.onClick) {
      this.props.onClick(bucket);
    }
  };

  onHover = (bucket) => {
    this.setState({ hoveredBucket: bucket });
  };

  onBlur = () => {
    this.setState({ hoveredBucket: {} });
  };

  getChartData(items, selectedItem) {
    const yMax = d3.max(items, (d) => d.y);
    const MINIMUM_BUCKET_SIZE = yMax * 0.02;

    return items.map((item) => {
      const padding = (item.x - item.x0) / 20;
      return {
        ...item,
        color:
          item === selectedItem
            ? theme.euiColorVis1
            : tint(0.5, theme.euiColorVis1),
        x0: item.x0 + padding,
        x: item.x - padding,
        y: item.y > 0 ? Math.max(item.y, MINIMUM_BUCKET_SIZE) : 0,
      };
    });
  }

  render() {
    const {
      backgroundHover,
      bucketIndex,
      buckets,
      bucketSize,
      formatX,
      formatYShort,
      formatYLong,
      tooltipFooter,
      tooltipHeader,
      verticalLineHover,
      width: XY_WIDTH,
      legends,
    } = this.props;
    const { hoveredBucket } = this.state;
    if (isEmpty(buckets) || XY_WIDTH === 0) {
      return null;
    }

    const isTimeSeries =
      this.props.xType === 'time' || this.props.xType === 'time-utc';

    const xMin = d3.min(buckets, (d) => d.x0);
    const xMax = d3.max(buckets, (d) => d.x);
    const yMin = 0;
    const yMax = d3.max(buckets, (d) => d.y);
    const selectedBucket = buckets[bucketIndex];
    const chartData = this.getChartData(buckets, selectedBucket);

    const x = scaleLinear()
      .domain([xMin, xMax])
      .range([XY_MARGIN.left, XY_WIDTH - XY_MARGIN.right]);

    const y = scaleLinear().domain([yMin, yMax]).range([XY_HEIGHT, 0]).nice();

    const [xMinZone, xMaxZone] = getDomainTZ(xMin, xMax);
    const xTickValues = isTimeSeries
      ? getTimeTicksTZ({
          domain: [xMinZone, xMaxZone],
          totalTicks: X_TICK_TOTAL,
          width: XY_WIDTH,
        })
      : undefined;

    const xDomain = x.domain();
    const yDomain = y.domain();
    const yTickValues = [0, yDomain[1] / 2, yDomain[1]];
    const shouldShowTooltip =
      hoveredBucket.x > 0 && (hoveredBucket.y > 0 || isTimeSeries);

    const showVerticalLineHover = verticalLineHover(hoveredBucket);
    const showBackgroundHover = backgroundHover(hoveredBucket);

    const hasValidCoordinates = buckets.some((bucket) =>
      isValidCoordinateValue(bucket.y)
    );
    const noHits = this.props.noHits || !hasValidCoordinates;

    const xyPlotProps = {
      dontCheckIfEmpty: true,
      xType: this.props.xType,
      width: XY_WIDTH,
      height: XY_HEIGHT,
      margin: XY_MARGIN,
      xDomain: xDomain,
      yDomain: yDomain,
    };

    const xAxisProps = {
      style: { strokeWidth: '1px' },
      marginRight: 10,
      tickSize: 0,
      tickTotal: X_TICK_TOTAL,
      tickFormat: formatX,
      tickValues: xTickValues,
    };

    const emptyStateChart = (
      <XYPlot {...xyPlotProps}>
        <XAxis {...xAxisProps} />
        <StatusText
          marginLeft={30}
          text={i18n.translate('xpack.apm.histogram.plot.noDataLabel', {
            defaultMessage: 'No data within this time range.',
          })}
        />
      </XYPlot>
    );

    return (
      <div style={{ position: 'relative', height: XY_HEIGHT }}>
        <ChartsWrapper>
          {noHits ? (
            <>{emptyStateChart}</>
          ) : (
            <>
              <XYPlot {...xyPlotProps}>
                <HorizontalGridLines tickValues={yTickValues} />
                <XAxis {...xAxisProps} />
                <YAxis
                  tickSize={0}
                  hideLine
                  tickValues={yTickValues}
                  tickFormat={formatYShort}
                />

                {showBackgroundHover && (
                  <SingleRect
                    x={x(hoveredBucket.x0)}
                    width={x(bucketSize) - x(0)}
                    style={{
                      fill: theme.euiColorLightestShade,
                    }}
                  />
                )}

                {shouldShowTooltip && (
                  <Tooltip
                    style={{
                      marginLeft: '1%',
                      marginRight: '1%',
                    }}
                    header={tooltipHeader(hoveredBucket)}
                    footer={tooltipFooter(hoveredBucket)}
                    tooltipPoints={[{ value: formatYLong(hoveredBucket.y) }]}
                    x={hoveredBucket.xCenter}
                    y={yDomain[1] / 2}
                  />
                )}

                {selectedBucket && (
                  <SingleRect
                    x={x(selectedBucket.x0)}
                    width={x(bucketSize) - x(0)}
                    style={{
                      fill: 'transparent',
                      stroke: theme.euiColorVis1,
                      rx: '0px',
                      ry: '0px',
                    }}
                  />
                )}

                <VerticalRectSeries
                  colorType="literal"
                  data={chartData}
                  style={{
                    rx: '0px',
                    ry: '0px',
                  }}
                />

                {showVerticalLineHover && hoveredBucket?.x && (
                  <VerticalGridLines tickValues={[hoveredBucket.x]} />
                )}

                <Voronoi
                  extent={[
                    [XY_MARGIN.left, XY_MARGIN.top],
                    [XY_WIDTH, XY_HEIGHT],
                  ]}
                  nodes={buckets.map((bucket) => {
                    return {
                      ...bucket,
                      xCenter: (bucket.x0 + bucket.x) / 2,
                    };
                  })}
                  onClick={this.onClick}
                  onHover={this.onHover}
                  onBlur={this.onBlur}
                  x={(d) => x(d.xCenter)}
                  y={() => 1}
                />
              </XYPlot>

              {legends && (
                <Legends
                  series={legends}
                  seriesEnabledState={[]}
                  hiddenSeriesCount={0}
                  clickLegend={() => {}}
                  truncateLegends={false}
                  noHits={noHits}
                />
              )}
            </>
          )}
        </ChartsWrapper>
      </div>
    );
  }
}

HistogramInner.propTypes = {
  backgroundHover: PropTypes.func,
  bucketIndex: PropTypes.number,
  buckets: PropTypes.array.isRequired,
  bucketSize: PropTypes.number.isRequired,
  formatX: PropTypes.func,
  formatYLong: PropTypes.func,
  formatYShort: PropTypes.func,
  onClick: PropTypes.func,
  tooltipFooter: PropTypes.func,
  tooltipHeader: PropTypes.func,
  verticalLineHover: PropTypes.func,
  width: PropTypes.number.isRequired,
  xType: PropTypes.string,
  legends: PropTypes.array,
  noHits: PropTypes.bool,
};

HistogramInner.defaultProps = {
  backgroundHover: () => null,
  formatYLong: (value) => value,
  formatYShort: (value) => value,
  tooltipFooter: () => null,
  tooltipHeader: () => null,
  verticalLineHover: () => null,
  xType: 'linear',
  noHits: false,
};

export default makeWidthFlexible(HistogramInner);
