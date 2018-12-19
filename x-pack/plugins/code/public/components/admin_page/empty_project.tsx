/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { ImportProject } from './import_project';

const Root = styled.div``;
const H1 = styled.h1``;
const H6 = styled.h6``;

export const EmptyProject = () => (
  <Root>
    <H1>You don't have any project yet.</H1>
    <H6>Let's import your first one</H6>
    <ImportProject />
    <EuiButton>View the Setup Guide</EuiButton>
  </Root>
);
