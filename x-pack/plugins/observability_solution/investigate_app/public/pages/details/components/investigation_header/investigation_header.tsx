/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { useInvestigation } from '../../contexts/investigation_context';
import { AlertDetailsButton } from './alert_details_button';

export function InvestigationHeader() {
  const { investigation } = useInvestigation();

  if (!investigation) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m" alignItems="flexStart">
      <EuiFlexItem>
        <AlertDetailsButton />
      </EuiFlexItem>
      <EuiFlexItem>{investigation.title}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
