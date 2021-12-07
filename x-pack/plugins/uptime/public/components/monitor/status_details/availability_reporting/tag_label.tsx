/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiBadge } from '@elastic/eui';
import { StatusTag } from './location_status_tags';
import { STATUS } from '../../../../../common/constants';

const BadgeItem = styled.div`
  white-space: nowrap;
  display: inline-block;
  @media (max-width: 1042px) {
    display: inline-block;
    margin-right: 16px;
  }
`;

export const TagLabel: React.FC<StatusTag> = ({ color, label, status }) => {
  return (
    <BadgeItem>
      <EuiBadge color={status === STATUS.DOWN ? 'danger' : 'success'}>{label}</EuiBadge>
    </BadgeItem>
  );
};
