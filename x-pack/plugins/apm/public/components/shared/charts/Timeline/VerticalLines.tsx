/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import React, { PureComponent } from 'react';
import { VerticalGridLines, XYPlot } from 'react-vis';
import { Mark } from '../../../app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Marks';
import { PlotValues } from './plotUtils';

interface VerticalLinesProps {
  marks?: Mark[];
  plotValues: PlotValues;
  topTraceDuration: number;
}

export class VerticalLines extends PureComponent<VerticalLinesProps> {
  render() {
    const { topTraceDuration, marks = [] } = this.props;
    const {
      width,
      height,
      margins,
      xDomain,
      tickValues
    } = this.props.plotValues;

    const markTimes = marks
      .filter(mark => mark.verticalLine)
      .map(({ offset }) => offset);

    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0
        }}
      >
        <XYPlot
          dontCheckIfEmpty
          width={width}
          height={height + margins.top}
          margin={margins}
          xDomain={xDomain}
        >
          <VerticalGridLines
            tickValues={tickValues}
            style={{ stroke: theme.euiColorLightestShade }}
          />

          <VerticalGridLines
            tickValues={markTimes}
            style={{ stroke: theme.euiColorMediumShade }}
          />

          {topTraceDuration > 0 && (
            <VerticalGridLines
              tickValues={[topTraceDuration]}
              style={{ stroke: theme.euiColorMediumShade }}
            />
          )}
        </XYPlot>
      </div>
    );
  }
}
