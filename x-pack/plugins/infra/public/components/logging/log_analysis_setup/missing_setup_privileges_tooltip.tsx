/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip, PropsOf } from '@elastic/eui';
import React from 'react';
import {
  missingMlPrivilegesTitle,
  missingMlSetupPrivilegesDescription,
} from './missing_privileges_messages';

export const MissingSetupPrivilegesToolTip: React.FC<
  Omit<PropsOf<EuiToolTip>, 'content' | 'title'>
> = (props) => (
  <EuiToolTip
    {...props}
    content={missingMlSetupPrivilegesDescription}
    title={missingMlPrivilegesTitle}
  />
);
