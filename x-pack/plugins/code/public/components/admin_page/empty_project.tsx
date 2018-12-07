/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { ImportProject } from './import_project';

export const EmptyProject = () => (
  <div className="code-projects-tab">
    <EuiSpacer size="xl" />
    <div className="code-projects-tab__empty_header">
      <EuiText>
        <h1>You don't have any projects yet.</h1>
      </EuiText>
      <EuiText color="subdued">
        <p>Let's import your first one.</p>
      </EuiText>
    </div>
    <ImportProject />
    <EuiSpacer />
    <EuiFlexGroup justifyContent="center">
      <EuiButton>View the Setup Guide</EuiButton>
    </EuiFlexGroup>
  </div>
);
