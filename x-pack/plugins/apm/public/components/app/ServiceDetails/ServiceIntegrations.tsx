/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';

export function ServiceIntegrations() {
  return (
    <EuiButton iconType="arrowDown" iconSide="right">
      Integrations
    </EuiButton>
  );
}
