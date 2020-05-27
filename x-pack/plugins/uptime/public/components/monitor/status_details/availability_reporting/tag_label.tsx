/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiBadge, EuiText } from '@elastic/eui';
import { StatusTag } from '../../location_map';

const BadgeItem = styled.div`
  white-space: nowrap;
  @media (max-width: 1042px) {
    display: inline-block;
    margin-right: 16px;
  }
`;

const TextStyle = styled.div`
  font-weight: 600;
`;

interface Props {
  item: StatusTag;
}

export const TagLabel: React.FC<Props> = ({ item: { color, label, timestamp } }) => {
  return (
    <BadgeItem>
      <EuiBadge color={color}>
        <EuiText size="m">
          <TextStyle>{label}</TextStyle>
        </EuiText>
      </EuiBadge>
    </BadgeItem>
  );
};
