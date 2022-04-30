/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps } from 'react';
import { SeverityBadge } from './severity_badge';

type Args = ComponentProps<typeof SeverityBadge>;

export default {
  title: 'app/Alerts/SeverityBadge',
  component: SeverityBadge,
};

export function Example({ severityLevel }: Args) {
  return <SeverityBadge severityLevel={severityLevel} />;
}
Example.args = { severityLevel: 'critical' } as Args;
