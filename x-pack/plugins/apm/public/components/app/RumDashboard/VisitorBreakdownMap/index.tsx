/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiTitle, EuiSpacer } from '@elastic/eui';
import { EmbeddedMap } from './EmbeddedMap';

export function VisitorBreakdownMap() {
  return (
    <>
      <EuiTitle size="xs">
        <h3>Page load duration by region</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <div style={{ height: 400 }}>
        <EmbeddedMap />
      </div>
    </>
  );
}
