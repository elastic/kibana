/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import { Ecs } from '../../../../graphql/types';

import { RowRenderer } from '.';

const PlainRow = styled.div`
  width: 100%;
  &:hover {
    border: 1px solid ${props => props.theme.eui.euiColorMediumShade};
  }
`;

export const plainRowRenderer: RowRenderer = {
  isInstance: (data: Ecs) => true,
  renderRow: (data: Ecs, children: React.ReactNode) => <PlainRow>{children}</PlainRow>,
};
