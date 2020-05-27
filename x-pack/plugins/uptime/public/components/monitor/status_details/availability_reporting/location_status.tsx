/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import styled from 'styled-components';
import { TagLabel } from './tag_label';

const TimeStampSpan = styled.span`
  display: inline-block;
  margin-left: 4px;
  white-space: nowrap;
`;

export const LocationAvailability = ({ locationStatus }) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem style={{ flexBasis: '30%' }}>
        <TagLabel item={locationStatus} />
      </EuiFlexItem>
      <EuiFlexItem>99.99%</EuiFlexItem>
      <EuiFlexItem>
        <TimeStampSpan>
          <EuiText color="subdued">{locationStatus.timestamp}</EuiText>
        </TimeStampSpan>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
