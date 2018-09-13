/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPage, EuiPageBody, EuiPageContent } from '@elastic/eui';
import { WorkpadLoader } from '../../components/workpad_loader';

export const HomeApp = () => (
  <EuiPage restrictWidth>
    <EuiPageBody>
      <EuiPageContent panelPaddingSize="none" horizontalPosition="center">
        <WorkpadLoader onClose={() => {}} />
      </EuiPageContent>
    </EuiPageBody>
  </EuiPage>
);
