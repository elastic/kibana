/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React, { memo } from 'react';
import { EuiPanel } from '@elastic/eui';

export const PanelWrapper = memo(function ({ className }: { className?: string }) {
  return (
    <EuiPanel className={className}>
      {children}
      <PanelContent />
    </EuiPanel>
  );
});
