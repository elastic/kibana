/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AttackDiscoveryUpsellingPage } from '@kbn/security-solution-upselling/pages/attack_discovery';
import React, { useMemo } from 'react';

import { UpgradeActions } from './upgrade_actions';
import * as i18n from './translations';

/**
 * This component passes self-managed-specific upgrade actions and `i18n` to
 * the platform agnostic `AttackDiscoveryUpsellingPage` component.
 */
const AttackDiscoveryUpsellingPageESSComponent: React.FC = () => {
  const actions = useMemo(
    () => (
      <EuiFlexGroup data-test-subj="essActions" justifyContent="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <UpgradeActions />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  return (
    <AttackDiscoveryUpsellingPage
      actions={actions}
      availabilityMessage={i18n.AVAILABILITY_MESSAGE}
      upgradeMessage={i18n.UPGRADE_MESSAGE}
    />
  );
};

AttackDiscoveryUpsellingPageESSComponent.displayName = 'AttackDiscoveryUpsellingPageESS';

export const AttackDiscoveryUpsellingPageESS = React.memo(AttackDiscoveryUpsellingPageESSComponent);
