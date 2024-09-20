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
import { InvestigationTag } from '../../../../components/investigation_tag/investigation_tag';
import { InvestigationStatusBadge } from '../../../../components/investigation_status_badge/investigation_status_badge';

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
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexItem>{investigation.title}</EuiFlexItem>

        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiFlexItem grow={false}>
            <InvestigationStatusBadge status={investigation.status} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} wrap gutterSize="s">
              {investigation.tags.map((tag) => (
                <InvestigationTag key={tag} tag={tag} />
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
