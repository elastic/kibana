/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { Sticky } from 'react-sticky';
import { XYPlot, XAxis } from 'react-vis';
import LastTickValue from './LastTickValue';
import AgentMarker from './AgentMarker';
import { colors, px } from '../../../../style/variables';
import { getTimeFormatter } from '../../../../utils/formatters';

// Remove last tick if it's too close to xMax
const getXAxisTickValues = (tickValues, xMax) =>
  _.last(tickValues) * 1.05 > xMax ? tickValues.slice(0, -1) : tickValues;

function TimelineAxis({ header, plotValues, agentMarks }) {
  const { margins, tickValues, width, xDomain, xMax, xScale } = plotValues;
  const tickFormat = getTimeFormatter(xMax);
  const xAxisTickValues = getXAxisTickValues(tickValues, xMax);

  return (
    <Sticky disableCompensation>
      {({ style }) => {
        return (
          <div
            style={{
              position: 'absolute',
              backgroundColor: colors.white,
              borderBottom: `1px solid ${colors.gray3}`,
              height: px(margins.top),
              zIndex: 2,
              width: '100%',
              ...style
            }}
          >
            {header}
            <XYPlot
              dontCheckIfEmpty
              width={width}
              height={40}
              margin={{
                top: 40,
                left: margins.left,
                right: margins.right
              }}
              xDomain={xDomain}
            >
              <XAxis
                hideLine
                orientation="top"
                tickSize={0}
                tickValues={xAxisTickValues}
                tickFormat={tickFormat}
                style={{
                  text: { fill: colors.gray3 }
                }}
              />

              <LastTickValue x={xScale(xMax)} value={tickFormat(xMax)} />

              {agentMarks.map(agentMark => (
                <AgentMarker
                  key={agentMark.timeAxis}
                  agentMark={agentMark}
                  x={xScale(agentMark.timeAxis)}
                />
              ))}
            </XYPlot>
          </div>
        );
      }}
    </Sticky>
  );
}

TimelineAxis.propTypes = {
  header: PropTypes.node,
  plotValues: PropTypes.object.isRequired,
  agentMarks: PropTypes.array
};

TimelineAxis.defaultProps = {
  agentMarks: []
};

export default TimelineAxis;
