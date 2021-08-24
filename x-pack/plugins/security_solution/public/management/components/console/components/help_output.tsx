/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren } from 'react';
import { EuiCallOut } from '@elastic/eui';

export type HelpOutputProps = PropsWithChildren<{}>;
export const HelpOutput = memo<HelpOutputProps>(({ children }) => {
  return <EuiCallOut color="primary">{children}</EuiCallOut>;
});
HelpOutput.displayName = 'HelpOutput';
