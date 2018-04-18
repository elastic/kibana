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
      `Rollup index patterns can only match against indices created from rollup jobs.
      They may have limited metrics, fields, intervals and aggregations available.
      The index pattern must match a rollup index exactly (no wildcards) and is
      limited to rollup indices that have one job configuration, or multiple jobs
      with the same configuration.`
    }
  />
);
