/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiResizeObserver } from '@elastic/eui';
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
  margins: Margins;
  width?: number;
}

function TimeLineContainer({
  width,
  xMin,
  xMax,
  height,
  marks,
  margins,
}: TimelineProps) {
  if (xMax == null || !width) {
    return null;
  }
  const plotValues = getPlotValues({ width, xMin, xMax, height, margins });
  const topTraceDuration = xMax - (xMin ?? 0);

  return (
    <>
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
    </>
  );
}

export function Timeline(props: TimelineProps) {
  const [width, setWidth] = useState(0);
  return (
    <EuiResizeObserver onResize={(size) => setWidth(size.width)}>
      {(resizeRef) => (
        <div style={{ width: '100%', height: '100%' }} ref={resizeRef}>
          <TimeLineContainer {...props} width={width} />
        </div>
      )}
    </EuiResizeObserver>
  );
}
