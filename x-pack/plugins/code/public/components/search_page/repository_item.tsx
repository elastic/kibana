/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiTitle } from '@elastic/eui';
import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

export const RepoItem = (props: any) => (
  <EuiPanel>
    <EuiTitle size="xs">
      <h2>
        <Link to={`/${props.uri}`}>{props.uri}</Link>
      </h2>
    </EuiTitle>
  </EuiPanel>
);

export const ScopeSelectorContainer = styled.div`
  text-align: center;
`;
