/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiCallOut
} from '@elastic/eui';

export const RollupPrompt = () => (
  <EuiCallOut
    size="s"
    title={
      `Rollup index patterns can match against one rollup index and zero or more
      regular indices. They will have limited metrics, fields, intervals and aggregations
      available based on the rollup index job configuration. The rollup index is
      limited to those that have one job configuration, or multiple jobs
      with the same configuration.`
    }
  />
);
