/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiSpacer, EuiFlexItem } from '@elastic/eui';

import { NotificationsSetup } from 'src/core/public';

import { useIlmPolicyStatus } from '../../../lib/ilm_policy_status_context';

import { IlmPolicyMigrationNeededCallOut } from './ilm_policy_migration_needed_callout';

interface Props {
  toasts: NotificationsSetup['toasts'];
}

export const MigrateIlmPolicyCallOut: FunctionComponent<Props> = ({ toasts }) => {
  const { isLoading, recheckStatus, status } = useIlmPolicyStatus();

  if (isLoading || !status || status === 'ok') {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexItem>
        <IlmPolicyMigrationNeededCallOut toasts={toasts} onMigrationDone={recheckStatus} />
      </EuiFlexItem>
    </>
  );
};
