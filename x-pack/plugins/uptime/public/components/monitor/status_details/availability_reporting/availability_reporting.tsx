/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { StatusTag } from './location_status_tags';

const LastCheck = styled(EuiFlexItem)`
  white-space: nowrap;
`;

interface Props {
  ups: number;
  downs: number;
}

export const AvailabilityReporting: React.FC<Props> = ({ ups, downs }) => {
  const availability = (ups / (ups + downs)) * 100;

  return (
    <>
      <EuiTitle size="s">
        <h3>{availability.toFixed(2)}% Availability</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem style={{}}>Location</EuiFlexItem>
        <EuiFlexItem style={{}}>Availability</EuiFlexItem>
        <LastCheck>Last check</LastCheck>
      </EuiFlexGroup>
    </>
  );
};
