/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ChartList } from './chart_list';

export const TopResourceRiskList = () => {
  return (
    <ChartList
      items={[
        { label: 'AWS S3 buckets', values: [303, 204] },
        { label: 'GCP Database', values: [352, 186] },
        { label: 'Kubernetes Pod Configuration', values: [425, 132] },
        { label: 'Azure Network Policies', values: [125, 65] },
        { label: 'AWS IAM', values: [225, 132] },
      ]}
    />
  );
};
