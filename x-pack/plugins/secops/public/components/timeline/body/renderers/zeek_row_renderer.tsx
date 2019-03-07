/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { Ecs } from '../../../../graphql/types';

import { RowRenderer } from '.';
import { ZeekDetails } from './zeek_details';

const ZeekRow = styled.div`
  width: 100%;
  overflow: hidden;
  &:hover {
    border: 1px solid ${props => props.theme.eui.euiColorMediumShade};
  }
`;

export const zeekRowRenderer: RowRenderer = {
  isInstance: (ecs: Ecs) => {
    const module: string | null = get('event.module', ecs);
    return module != null && module.toLowerCase() === 'zeek';
  },
  renderRow: (data: Ecs, children: React.ReactNode) => (
    <ZeekRow>
      {children}
      <ZeekDetails data={data} />
    </ZeekRow>
  ),
};
