/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { AuthenticatedUser } from '@kbn/security-plugin/common';
import React from 'react';
import { useFetchInvestigation } from '../../../../hooks/use_fetch_investigation';
import { InvestigationItems } from '../investigation_items/investigation_items';
import { InvestigationNotes } from '../investigation_notes/investigation_notes';

interface Props {
  user: AuthenticatedUser;
  investigationId: string;
}

export function InvestigationDetails({ user, investigationId }: Props) {
  const { data: investigation, isLoading } = useFetchInvestigation({ id: investigationId });

  if (isLoading || !investigation) {
    return <EuiLoadingSpinner />;
  }

  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem grow={8}>
        <InvestigationItems investigation={investigation} />
      </EuiFlexItem>

      <EuiFlexItem grow={2}>
        <InvestigationNotes investigation={investigation} user={user} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
