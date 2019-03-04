/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { Link } from 'react-router-dom';
import { ImportProject } from './import_project';

export const EmptyProject = ({ isAdmin }: { isAdmin: boolean }) => (
  <div className="code-projects-tab">
    <EuiSpacer size="xl" />
    <div className="code-projects-tab__empty_header">
      <EuiText>
        <h1>You don't have any projects yet.</h1>
      </EuiText>
      <EuiText color="subdued">{isAdmin && <p>Let's import your first one.</p>}</EuiText>
    </div>
    {isAdmin && <ImportProject />}
    <EuiSpacer />
    <EuiFlexGroup justifyContent="center">
      <EuiButton>
        <Link to="/setup-guide">View the Setup Guide</Link>
      </EuiButton>
    </EuiFlexGroup>
  </div>
);
