/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiText, EuiSpacer } from '@elastic/eui';
import { LinkToApp } from '../../../../../common/components/endpoint/link_to_app';
import {
  CustomConfigurePackagePolicyContent,
  CustomConfigurePackagePolicyProps,
} from '../../../../../../../ingest_manager/public';
import { getPolicyDetailPath } from '../../../../common/routing';
import { MANAGEMENT_APP_ID } from '../../../../common/constants';
import { PolicyDetailsRouteState } from '../../../../../../common/endpoint/types';

/**
 * Exports Endpoint-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const ConfigureEndpointPackagePolicy = memo<CustomConfigurePackagePolicyContent>(
  ({
    from,
    packagePolicyId,
    packagePolicy: { policy_id: agentPolicyId },
  }: CustomConfigurePackagePolicyProps) => {
    let policyUrl = '';
    if (from === 'edit' && packagePolicyId) {
      // Cannot use formalUrl here since the code is called in Ingest, which does not use redux
      policyUrl = getPolicyDetailPath(packagePolicyId);
    }

    const policyDetailRouteState = useMemo((): undefined | PolicyDetailsRouteState => {
      if (from !== 'edit') {
        return undefined;
      }
      const navigateTo: PolicyDetailsRouteState['onSaveNavigateTo'] &
        PolicyDetailsRouteState['onCancelNavigateTo'] = [
        'ingestManager',
        { path: `#/policies/${agentPolicyId}/edit-integration/${packagePolicyId}` },
      ];
      return {
        onSaveNavigateTo: navigateTo,
        onCancelNavigateTo: navigateTo,
      };
    }, [agentPolicyId, from, packagePolicyId]);

    return (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut
          data-test-subj={`endpointPackagePolicy_${from === 'edit' ? 'edit' : 'create'}`}
          iconType="iInCircle"
        >
          <EuiText size="s">
            <p>
              {from === 'edit' ? (
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.ingestManager.editPackagePolicy.endpointConfiguration"
                  defaultMessage="Click {advancedConfigOptionsLink} to edit advanced configuration options."
                  values={{
                    advancedConfigOptionsLink: (
                      <LinkToApp
                        data-test-subj="editLinkToPolicyDetails"
                        appId={MANAGEMENT_APP_ID}
                        appPath={policyUrl}
                        appState={policyDetailRouteState}
                      >
                        <FormattedMessage
                          id="xpack.securitySolution.endpoint.ingestManager.editPackagePolicy.endpointConfigurationLink"
                          defaultMessage="here"
                        />
                      </LinkToApp>
                    ),
                  }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.ingestManager.createPackagePolicy.endpointConfiguration"
                  defaultMessage="We'll save your integration with our recommended defaults. You can change this later by editing the Endpoint Security integration within your agent policy."
                />
              )}
            </p>
          </EuiText>
        </EuiCallOut>
      </>
    );
  }
);

ConfigureEndpointPackagePolicy.displayName = 'ConfigureEndpointPackagePolicy';
