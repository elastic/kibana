/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { ImportProject } from './import_project';

const Root = styled.div``;

export const EmptyProject = () => (
  <Root>
    <EuiSpacer size="xl" />
    <EuiText textAlign="center">
      <h1>You don't have any projects yet.</h1>
    </EuiText>
    <EuiText textAlign="center" color="subdued">
      <p>Let's import your first one.</p>
    </EuiText>
    <ImportProject />
    <EuiSpacer />
    <EuiFlexGroup justifyContent="center">
      <EuiButton>View the Setup Guide</EuiButton>
    </EuiFlexGroup>
  </Root>
);
