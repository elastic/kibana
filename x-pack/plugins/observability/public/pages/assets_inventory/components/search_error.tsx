/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React from 'react';

export function SearchError({ error }: { error: string | null }) {
  if (error === null) {
    return null;
  }

  return (
    <div>
      <EuiCallOut title="Search error" color="danger" iconType="error">
        <p>{error}</p>
      </EuiCallOut>
      <EuiSpacer />
    </div>
  );
}
