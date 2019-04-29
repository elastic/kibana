/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React, { Fragment } from 'react';
import { PropTypes } from 'prop-types';
import {
  EuiProgress,
  EuiToolTip
} from '@elastic/eui';

export function TimeRangeBar({
  isRunning,
  timerange
}) {
  const style = {
    width: timerange.widthPx,
    marginLeft: timerange.fromPx
  };

  if (isRunning) {
    // set to gantt bar width so it shows up
    return (
      <div style={{ width: '299px' }}>
        <EuiProgress size="xs" color="subdued" />
      </div>
    );
  }

  return (
    <EuiToolTip
      position="top"
      content={timerange.label}
    >
      <Fragment>
        <div className="mlJobSelector__ganttBarBackEdge">
          <div className="mlJobSelector__ganttBarDashed" />
        </div>
        <div style={style} className="mlJobSelector__ganttBar"/>
      </Fragment>
    </EuiToolTip>
  );
}

TimeRangeBar.propTypes = {
  isRunning: PropTypes.bool,
  timerange: PropTypes.shape({
    widthPx: PropTypes.number,
    label: PropTypes.string,
    fromPx: PropTypes.number,
  })
};
