/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const Repo = styled.td`
  padding: 1rem;
  font-size: 1rem;
  font-weight: bold;
  border: 1px solid;
`;

export const Repos = styled.table`
  min-width: 20rem;
  border-collapse: collapse;
`;

export const RepoItem = (props: any) => (
  <tr>
    <Repo>
      <Link to={`/${props.uri}`}>{props.uri}</Link>
    </Repo>
  </tr>
);

export const ScopeSelectorContainer = styled.div`
  text-align: center;
`;
