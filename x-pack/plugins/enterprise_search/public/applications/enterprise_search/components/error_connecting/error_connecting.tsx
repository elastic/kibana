/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPage, EuiPageContent } from '@elastic/eui';

import { ErrorStatePrompt } from '../../../shared/error_state';

export const ErrorConnecting: React.FC = () => (
  <EuiPage restrictWidth>
    <EuiPageContent>
      <ErrorStatePrompt />
    </EuiPageContent>
  </EuiPage>
);
