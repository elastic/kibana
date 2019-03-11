/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { fontSizes } from '../../style/variables';
import { ErrorPanel } from './error_panel';

const Container = styled.div`
  margin: auto;
  fontsize: ${fontSizes.xlarge};
`;

export const NotFound = () => (
  <Container>
    <ErrorPanel
      title={<h2>404</h2>}
      content="Unfortunately that page doesn’t exist. You can try searching to find what you’re looking for."
    />
  </Container>
);
