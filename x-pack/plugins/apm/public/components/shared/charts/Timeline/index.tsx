/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { PureComponent, ReactNode } from 'react';
import { makeWidthFlexible } from 'react-vis';
import { getPlotValues } from './plotUtils';
import { TimelineAxis } from './TimelineAxis';
import { VerticalLines } from './VerticalLines';
import { ErrorMark } from '../../../app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Marks/get_error_marks';
import { AgentMark } from '../../../app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Marks/get_agent_marks';

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
