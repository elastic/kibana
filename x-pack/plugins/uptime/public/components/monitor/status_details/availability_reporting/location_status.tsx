/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import styled from 'styled-components';
import { TagLabel } from './tag_label';
import { StatusTag } from './location_status_tags';

const TimeStampSpan = styled.span`
  display: inline-block;
  margin-left: 4px;
  white-space: nowrap;
`;

interface Props {
  locationStatus: StatusTag;
}

export const LocationAvailability: React.FC<Props> = ({ locationStatus }) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={2}>
        <TagLabel item={locationStatus} />
      </EuiFlexItem>
      <EuiFlexItem style={{}}>{locationStatus.availability.toFixed(2)}%</EuiFlexItem>
      <EuiFlexItem>
        <TimeStampSpan>
          <EuiText color="subdued">{locationStatus.timestamp}</EuiText>
        </TimeStampSpan>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
