/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiHealth,
} from '@elastic/eui';

const statusToHealthMap = {
  stopped: (
    <EuiHealth color="subdued">
      Stopped
    </EuiHealth>
  ),
  started: (
    <EuiHealth color="success">
      Started
    </EuiHealth>
  ),
  indexing: (
    <EuiHealth color="warning">
      Indexing
    </EuiHealth>
  ),
  abort: (
    <EuiHealth color="danger">
      Aborting
    </EuiHealth>
  ),
};

export const JobStatus = ({ status }) => statusToHealthMap[status];
