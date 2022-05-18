/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiCallOut } from '@elastic/eui';

export interface CommandExecutionFailureProps {
  error: Error;
}
export const CommandExecutionFailure = memo<CommandExecutionFailureProps>(({ error }) => {
  return <EuiCallOut>{error}</EuiCallOut>;
});
CommandExecutionFailure.displayName = 'CommandExecutionOutput';
