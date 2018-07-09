/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiProgress, EuiDelayHide } from '@elastic/eui';

export default ({ isLoading }) => {
  return (
    <EuiDelayHide
      hide={!isLoading}
      minimumDuration={1000}
      render={() => <EuiProgress size="xs" position="fixed" />}
    />
  );
};
