/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import { RowRenderer } from '.';

const PlainRow = styled.div`
  width: 100%;
  &:hover {
    background-color: ${props => props.theme.eui.euiTableHoverColor};
  }
`;

export const plainRowRenderer: RowRenderer = {
  isInstance: _ => true,
  renderRow: ({ children }) => <PlainRow>{children}</PlainRow>,
};
