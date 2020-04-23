/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ChartTarget } from './chart_target';

export function TimeseriesContainer(props) {
  const container = {
    display: 'flex',
    rowDirection: 'column',
    flex: '1 0 auto',
    position: 'relative',
  };

  return (
    <div style={container}>
      <ChartTarget {...props} />
    </div>
  );
}
