/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React, { Fragment } from 'react';
import { PropTypes } from 'prop-types';
import {
  EuiToolTip
} from '@elastic/eui';

export function TimeRangeBar({
  timerange
}) {
  const style = {
    width: timerange.widthPx,
    marginLeft: timerange.fromPx
  };
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
  timerange: PropTypes.shape({
    widthPx: PropTypes.number,
    label: PropTypes.string,
    fromPx: PropTypes.number,
  })
};
