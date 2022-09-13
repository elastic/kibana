/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSelector } from 'react-redux';
import { useUptimeSettingsContext } from '../../../contexts/uptime_settings_context';
import { usePrivateLocationPermissions } from '../hooks/use_private_location_permission';
import { selectAgentPolicies } from '../../../state/private_locations';

export const PolicyName = ({ agentPolicyId }: { agentPolicyId: string }) => {
  const { canReadAgentPolicies } = usePrivateLocationPermissions();

  const { basePath } = useUptimeSettingsContext();

  const { data: policies } = useSelector(selectAgentPolicies);

  const policy = policies?.items.find((policyT) => policyT.id === agentPolicyId);

  return (
    <EuiText size="s">
      <p>
        {canReadAgentPolicies && (
          <EuiTextColor color="subdued">
            {policy ? (
              <EuiLink href={`${basePath}/app/fleet/policies/${agentPolicyId}`}>
                {policy?.name}
              </EuiLink>
            ) : (
              <EuiText color="danger" size="s" className="eui-displayInline">
                {POLICY_IS_DELETED}
              </EuiText>
            )}
          </EuiTextColor>
        )}
      </p>
    </EuiText>
  );
};

const POLICY_IS_DELETED = i18n.translate('xpack.synthetics.monitorManagement.deletedPolicy', {
  defaultMessage: 'Policy is deleted',
});
