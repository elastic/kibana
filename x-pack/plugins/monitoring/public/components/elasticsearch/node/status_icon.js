/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StatusIcon } from 'plugins/monitoring/components/status_icon';

export function NodeStatusIcon({ status }) {
  const type = (status === 'Online') ? StatusIcon.TYPES.GREEN : StatusIcon.TYPES.GRAY;

  return (
    <StatusIcon type={type} label={`Health: ${status}`} />
  );
}
