/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { XYPlot, VerticalGridLines } from 'react-vis';
import { colors } from '../../../../style/variables';

class VerticalLines extends PureComponent {
  render() {
    const {
      width,
      height,
      margins,
      xDomain,
      tickValues,
      xMax
    } = this.props.plotValues;

    const agentMarkTimes = this.props.agentMarks.map(({ us }) => us);

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
            style={{ stroke: colors.gray5 }}
          />

          <VerticalGridLines
            tickValues={[...agentMarkTimes, xMax]}
            style={{ stroke: colors.gray3 }}
          />
        </XYPlot>
      </div>
    );
  }
}

VerticalLines.propTypes = {
  plotValues: PropTypes.object.isRequired,
  agentMarks: PropTypes.array
};

VerticalLines.defaultProps = {
  agentMarks: []
};

export default VerticalLines;
