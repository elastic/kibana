/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPage, EuiPageBody, EuiPageContent } from '@elastic/eui';
import { WorkpadManager } from '../../components/workpad_manager';

export const HomeApp = () => (
  <EuiPage restrictWidth style={{ width: '100%' }}>
    <EuiPageBody>
      <EuiPageContent panelPaddingSize="none" horizontalPosition="center">
        <WorkpadManager onClose={() => {}} />
      </EuiPageContent>
    </EuiPageBody>
  </EuiPage>
);
