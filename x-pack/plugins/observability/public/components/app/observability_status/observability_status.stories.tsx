/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ObservabilityStatus } from '.';

export default {
  title: 'app/ObservabilityStatus',
  component: ObservabilityStatus,
};

export function Example() {
  return (
    <div style={{ width: 380, backgroundColor: '#fff', padding: 40 }}>
      <ObservabilityStatus />
    </div>
  );
}
