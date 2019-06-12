/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { inRange } from 'lodash';
import { Sticky } from 'react-sticky';
import { XYPlot, XAxis } from 'react-vis';
import LastTickValue from './LastTickValue';
import AgentMarker from './AgentMarker';
import { px } from '../../../../style/variables';
import { getTimeFormatter } from '../../../../utils/formatters';
import theme from '@elastic/eui/dist/eui_theme_light.json';

// Remove any tick that is too close to traceRootDuration
const getXAxisTickValues = (tickValues, traceRootDuration) => {
  if (traceRootDuration == null) {
    return tickValues;
  }

  const padding = (tickValues[1] - tickValues[0]) / 2;
  const lowerBound = traceRootDuration - padding;
  const upperBound = traceRootDuration + padding;

  return tickValues.filter(value => {
    const isInRange = inRange(value, lowerBound, upperBound);
    return !isInRange && value !== traceRootDuration;
  });
};

function TimelineAxis({ plotValues, agentMarks, traceRootDuration }) {
  const { margins, tickValues, width, xDomain, xMax, xScale } = plotValues;
  const tickFormat = getTimeFormatter(xMax);
  const xAxisTickValues = getXAxisTickValues(tickValues, traceRootDuration);

  return (
    <Sticky disableCompensation>
      {({ style }) => {
        return (
          <div
            style={{
              position: 'absolute',
              borderBottom: `1px solid ${theme.euiColorMediumShade}`,
              height: px(margins.top),
              zIndex: 2,
              width: '100%',
              ...style
            }}
          >
            <XYPlot
              dontCheckIfEmpty
              width={width}
              height={margins.top}
              margin={{
                top: margins.top,
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
                tickPadding={20}
                style={{
                  text: { fill: theme.euiColorDarkShade }
                }}
              />

              {traceRootDuration > 0 && (
                <LastTickValue
                  x={xScale(traceRootDuration)}
                  value={tickFormat(traceRootDuration)}
                  marginTop={28}
                />
              )}

              {agentMarks.map(agentMark => (
                <AgentMarker
                  key={agentMark.name}
                  agentMark={agentMark}
                  x={xScale(agentMark.us)}
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
