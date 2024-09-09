/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AuthenticatedUser } from '@kbn/security-plugin/common';
import React from 'react';
import { InvestigationItems } from '../investigation_items/investigation_items';
import { InvestigationNotes } from '../investigation_notes/investigation_notes';

interface Props {
  user: AuthenticatedUser;
}

export function InvestigationDetails({ user }: Props) {
  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem grow={8}>
        <InvestigationItems />
      </EuiFlexItem>

      <EuiFlexItem grow={2}>
        <InvestigationNotes user={user} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
