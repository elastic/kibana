/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps, useState } from 'react';
import type { AlertStatus } from '../../../common/typings';
import { StatusFilter } from './status_filter';

type Args = ComponentProps<typeof StatusFilter>;

export default {
  title: 'app/Alerts/StatusFilter',
  component: StatusFilter,
  argTypes: {
    onChange: { action: 'change' },
  },
};

export function Example({ onChange }: Args) {
  const [status, setStatus] = useState<AlertStatus>('open');

  return (
    <StatusFilter
      status={status}
      onChange={(value) => {
        setStatus(value);
        onChange(value);
      }}
    />
  );
}
