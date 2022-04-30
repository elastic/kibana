/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps, useState } from 'react';
import type { AlertWorkflowStatus } from '../../../../../common/typings';
import { WorkflowStatusFilter } from './workflow_status_filter';

type Args = ComponentProps<typeof WorkflowStatusFilter>;

export default {
  title: 'app/Alerts/StatusFilter',
  component: WorkflowStatusFilter,
  argTypes: {
    onChange: { action: 'change' },
  },
};

export function Example({ onChange }: Args) {
  const [status, setStatus] = useState<AlertWorkflowStatus>('open');

  return (
    <WorkflowStatusFilter
      status={status}
      onChange={(value) => {
        setStatus(value);
        onChange(value);
      }}
    />
  );
}
