/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useApmParams } from '../../../../hooks/use_apm_params';

export function EntityLink() {
  const {
    path: { serviceName },
  } = useApmParams('/link-to/entity/{serviceName}');
  console.log('### caue  EntityLink  serviceName:', serviceName);

  return <div>{serviceName}</div>;
}
