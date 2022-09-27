/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import type { EuiToolTipProps } from '@elastic/eui';
import React from 'react';
import type { FC, PropsWithChildren } from 'react';
import {
  missingMlPrivilegesTitle,
  missingMlSetupPrivilegesDescription,
} from './missing_privileges_messages';

export const MissingSetupPrivilegesToolTip: FC<
  PropsWithChildren<Omit<EuiToolTipProps, 'content' | 'title'>>
> = (props) => (
  <EuiToolTip
    {...props}
    content={missingMlSetupPrivilegesDescription}
    title={missingMlPrivilegesTitle}
  />
);
