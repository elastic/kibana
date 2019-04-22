/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIconTip } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { CountBadge } from '../index';

interface OwnProps {
  title: string;
  infoTooltip: string;
  totalCount: number;
}

export const TableTitle = pure<OwnProps>(({ title, infoTooltip, totalCount }) => (
  <h3>
    {title}
    {!isEmpty(infoTooltip) && (
      <Sup>
        <EuiIconTip content={infoTooltip} position="right" />
      </Sup>
    )}
    <CountBadge color="hollow">{totalCount}</CountBadge>
  </h3>
));

const Sup = styled.sup`
  vertical-align: super;
  padding: 0 5px;
`;
