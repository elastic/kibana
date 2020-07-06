/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { PropTypes } from 'prop-types';
import { EuiToolTip } from '@elastic/eui';

export function TimeRangeBar({ isRunning, timerange, ganttBarWidth }) {
  const style = {
    width: timerange.widthPx,
    marginLeft: timerange.fromPx,
  };

  const className = `mlJobSelector__ganttBar${isRunning ? ' mlJobSelector__ganttBarRunning' : ''}`;

  return (
    <EuiToolTip position="top" content={timerange.label}>
      <Fragment>
        <div className="mlJobSelector__ganttBarBackEdge">
          <div className="mlJobSelector__ganttBarDashed" style={{ width: `${ganttBarWidth}px` }} />
        </div>
        <div style={style} className={className} />
      </Fragment>
    </EuiToolTip>
  );
}

TimeRangeBar.propTypes = {
  ganttBarWidth: PropTypes.number,
  isRunning: PropTypes.bool,
  timerange: PropTypes.shape({
    widthPx: PropTypes.number,
    label: PropTypes.string,
    fromPx: PropTypes.number,
  }),
};
