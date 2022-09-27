/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import React from 'react';
import type { FC, PropsWithChildren } from 'react';
import { RecreateJobButton, CreateJobButtonProps } from '../log_analysis_setup/create_job_button';

export const RecreateJobCallout: FC<
  PropsWithChildren<{
    hasSetupCapabilities?: boolean;
    onRecreateMlJob: CreateJobButtonProps['onClick'];
    title?: React.ReactNode;
  }>
> = ({ children, hasSetupCapabilities, onRecreateMlJob, title }) => (
  <EuiCallOut color="warning" iconType="alert" title={title}>
    {children}
    <RecreateJobButton
      color="warning"
      hasSetupCapabilities={hasSetupCapabilities}
      onClick={onRecreateMlJob}
    />
  </EuiCallOut>
);
