/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ChartList } from './chart_list';

export const ScorePerAccountAndCluster = () => {
  return (
    <ChartList
      items={[
        { label: '214587709542', values: [203, 124] },
        { label: '952145879536', values: [652, 486] },
        { label: '874021458738', values: [175, 132] },
        { label: '537021458796', values: [125, 65] },
        { label: '736021458795', values: [125, 32] },
      ]}
    />
  );
};
