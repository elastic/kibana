/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiBadge, EuiTextColor } from '@elastic/eui';
import { StatusTag } from './location_status_tags';

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
      <EuiBadge color={color}>
        <EuiTextColor color={status === 'down' ? 'ghost' : 'default'}>
          <h4>{label}</h4>
        </EuiTextColor>
      </EuiBadge>
    </BadgeItem>
  );
};
