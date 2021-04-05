/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyoutBody } from '@elastic/eui';
import { HostIsolationContent } from './content';

export const HostIsolationModal = React.memo(() => {
  return (
    <EuiFlyoutBody>
      <HostIsolationContent />
    </EuiFlyoutBody>
  );
});

HostIsolationModal.displayName = 'HostIsolationModal';
