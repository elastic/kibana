/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { EuiFlexGroup, EuiFlexItem, EuiFlyout, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { PolicyFromES } from '../../../../../common/types';
import { DeprecatedPolicyBadge } from './deprecated_policy_badge';
import { ManagedPolicyBadge } from './managed_policy_badge';
import { getPoliciesListPath } from '../../../services/navigation';

export const ViewPolicyFlyout = ({ policy }: { policy: PolicyFromES }) => {
  const history = useHistory();
  const onClose = () => {
    history.push(getPoliciesListPath());
  };
  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2>{policy.name}</h2>
            </EuiTitle>
          </EuiFlexItem>
          {policy.policy.deprecated ? (
            <EuiFlexItem grow={false}>
              {' '}
              <DeprecatedPolicyBadge />
            </EuiFlexItem>
          ) : null}
          {policy.policy?._meta?.managed ? (
            <EuiFlexItem grow={false}>
              {' '}
              <ManagedPolicyBadge />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlyoutHeader>
    </EuiFlyout>
  );
};
