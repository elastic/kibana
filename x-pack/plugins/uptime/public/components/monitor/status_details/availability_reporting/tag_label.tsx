/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiBadge, EuiText } from '@elastic/eui';

const BadgeItem = styled.div`
  white-space: nowrap;
  display: inline-block;
  @media (max-width: 1042px) {
    display: inline-block;
    margin-right: 16px;
  }
`;

interface Props {
  color: string;
  label: string;
}

export const TagLabel: React.FC<Props> = ({ color, label }) => {
  return (
    <BadgeItem>
      <EuiBadge color={color}>
        <EuiText size="s">
          <h4>{label}</h4>
        </EuiText>
      </EuiBadge>
    </BadgeItem>
  );
};
