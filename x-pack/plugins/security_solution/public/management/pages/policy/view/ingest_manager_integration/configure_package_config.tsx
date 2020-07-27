/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiText, EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LinkToApp } from '../../../../../common/components/endpoint/link_to_app';
import {
  CustomConfigurePackageConfigContent,
  CustomConfigurePackageConfigProps,
} from '../../../../../../../ingest_manager/public';
import { getPolicyDetailPath } from '../../../../common/routing';
import { MANAGEMENT_APP_ID } from '../../../../common/constants';
import { PolicyDetailsRouteState } from '../../../../../../common/endpoint/types';

/**
 * Exports Endpoint-specific package config instructions
 * for use in the Ingest app create / edit package config
 */
export const ConfigureEndpointPackageConfig = memo<CustomConfigurePackageConfigContent>(
  ({
    from,
    packageConfigId,
    packageConfig: { config_id: agentConfigId },
  }: CustomConfigurePackageConfigProps) => {
    let policyUrl = '';
    if (from === 'edit' && packageConfigId) {
      // Cannot use formalUrl here since the code is called in Ingest, which does not use redux
      policyUrl = getPolicyDetailPath(packageConfigId);
    }

    const policyDetailRouteState = useMemo((): undefined | PolicyDetailsRouteState => {
      if (from !== 'edit') {
        return undefined;
      }
      const navigateTo: PolicyDetailsRouteState['onSaveNavigateTo'] &
        PolicyDetailsRouteState['onCancelNavigateTo'] = [
        'ingestManager',
        { path: `#/configs/${agentConfigId}/edit-integration/${packageConfigId}` },
      ];
      return {
        onSaveNavigateTo: navigateTo,
        onCancelNavigateTo: navigateTo,
      };
    }, [agentConfigId, from, packageConfigId]);

    return (
      <>
        <EuiTitle size="xs">
          <h4>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.ingestManager.policyConfiguration"
              defaultMessage="Policy Configuration"
            />
          </h4>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiCallOut
          data-test-subj={`endpointPackageConfig_${from === 'edit' ? 'edit' : 'create'}`}
          iconType="iInCircle"
          title={i18n.translate(
            'xpack.securitySolution.endpoint.ingestManager.policyConfiguration.calloutTitle',
            {
              defaultMessage: 'Manage Policy configuration in the Security app',
            }
          )}
        >
          <EuiText size="s">
            <p>
              {from === 'edit' ? (
                <>
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.ingestManager.editPackageConfig.endpointConfiguration"
                    defaultMessage="You can make changes to the Policy Configuration in the Security app. Fleet will deploy changes to your agents whenever your Policy changes."
                  />
                  <EuiSpacer />
                  <LinkToApp
                    data-test-subj="editLinkToPolicyDetails"
                    asButton={true}
                    appId={MANAGEMENT_APP_ID}
                    className="editLinkToPolicyDetails"
                    appPath={policyUrl}
                    appState={policyDetailRouteState}
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.endpoint.ingestManager.editPackageConfig.configurePolicyLink"
                      defaultMessage="Configure Policy"
                    />
                  </LinkToApp>
                </>
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.ingestManager.createPackageConfig.endpointConfiguration"
                  defaultMessage="Any agents that use this agent configuration will use a basic policy. You can make changes to this policy in the Security app, and Fleet will deploy those changes to your agents."
                />
              )}
            </p>
          </EuiText>
        </EuiCallOut>
      </>
    );
  }
);

ConfigureEndpointPackageConfig.displayName = 'ConfigureEndpointPackageConfig';
