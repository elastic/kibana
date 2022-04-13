/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import React, { PureComponent, ReactNode } from 'react';
import { makeWidthFlexible } from 'react-vis';
import { AgentMark } from '../../../app/transaction_details/waterfall_with_summary/waterfall_container/marks/get_agent_marks';
import { ErrorMark } from '../../../app/transaction_details/waterfall_with_summary/waterfall_container/marks/get_error_marks';
import { getPlotValues } from './plot_utils';
import { TimelineAxis } from './timeline_axis';
import { VerticalLines } from './vertical_lines';

export type Mark = AgentMark | ErrorMark;

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface TimelineProps {
  marks?: Mark[];
  xMin?: number;
  xMax?: number;
  height: number;
  header?: ReactNode;
  margins: Margins;
  width?: number;
}

class TL extends PureComponent<TimelineProps> {
  // We normally do not define propTypes for TypeScript components, but the
  // `makeWidthFlexible` HOC from react-vis depends on them.
  static propTypes = {
    marks: PropTypes.array,
    xMin: PropTypes.number,
    xMax: PropTypes.number,
    height: PropTypes.number.isRequired,
    header: PropTypes.node,
    margins: PropTypes.object.isRequired,
    width: PropTypes.number,
  };

  render() {
    const { width, xMin, xMax, marks, height, margins } = this.props;
    if (xMax == null || !width) {
      return null;
    }
    const plotValues = getPlotValues({ width, xMin, xMax, height, margins });
    const topTraceDuration = xMax - (xMin ?? 0);

    return (
      <div>
        <TimelineAxis
          plotValues={plotValues}
          marks={marks}
          topTraceDuration={topTraceDuration}
        />
        <VerticalLines
          plotValues={plotValues}
          marks={marks}
          topTraceDuration={topTraceDuration}
        />
      </div>
    );
  }
}

export const Timeline = makeWidthFlexible(TL);
