/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LinkToApp } from '../../../../../common/components/endpoint/link_to_app';
import {
  CustomConfigurePackagePolicyContent,
  CustomConfigurePackagePolicyProps,
  pagePathGetters,
} from '../../../../../../../ingest_manager/public';
import { getPolicyDetailPath, getTrustedAppsListPath } from '../../../../common/routing';
import { MANAGEMENT_APP_ID } from '../../../../common/constants';
import {
  PolicyDetailsRouteState,
  TrustedAppsListPageRouteState,
} from '../../../../../../common/endpoint/types';
import { useKibana } from '../../../../../common/lib/kibana';

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

    const navigateTo = useMemo<
      PolicyDetailsRouteState['onSaveNavigateTo'] &
        PolicyDetailsRouteState['onCancelNavigateTo'] &
        TrustedAppsListPageRouteState['onBackButtonNavigateTo']
    >(() => {
      return [
        'ingestManager',
        {
          path: `#${pagePathGetters.edit_integration({
            policyId: agentPolicyId,
            packagePolicyId: packagePolicyId!,
          })}`,
        },
      ];
    }, [agentPolicyId, packagePolicyId]);

    const policyDetailRouteState = useMemo((): undefined | PolicyDetailsRouteState => {
      if (from !== 'edit') {
        return undefined;
      }
      return {
        onSaveNavigateTo: navigateTo,
        onCancelNavigateTo: navigateTo,
      };
    }, [from, navigateTo]);

    return (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut
          data-test-subj={`endpointPackagePolicy_${from === 'edit' ? 'edit' : 'create'}`}
          iconType="iInCircle"
        >
          <EuiText size="s">
            {from === 'edit' ? (
              <>
                <p>
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
                </p>
                <p>
                  <TrustedAppsMessage navigateTo={navigateTo} />
                </p>
              </>
            ) : (
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.ingestManager.createPackagePolicy.endpointConfiguration"
                  defaultMessage="We'll save your integration with our recommended defaults. You can change this later by editing the Endpoint Security integration within your agent policy."
                />
              </p>
            )}
          </EuiText>
        </EuiCallOut>
      </>
    );
  }
);

ConfigureEndpointPackagePolicy.displayName = 'ConfigureEndpointPackagePolicy';

const TrustedAppsMessage = memo<{
  navigateTo: TrustedAppsListPageRouteState['onBackButtonNavigateTo'];
}>(({ navigateTo }) => {
  const {
    services: {
      application: { getUrlForApp },
    },
  } = useKibana();
  const trustedAppsListUrl = getTrustedAppsListPath();
  const trustedAppsListRouteState = useMemo<TrustedAppsListPageRouteState>(() => {
    return {
      backButtonUrl: navigateTo[1]?.path
        ? `${getUrlForApp('ingestManager')}${navigateTo[1].path}`
        : undefined,
      onBackButtonNavigateTo: navigateTo,
      backButtonLabel: i18n.translate(
        'xpack.securitySolution.endpoint.ingestManager.editPackagePolicy.trustedAppsMessageReturnBackLabel',
        { defaultMessage: 'Back to edit integration' }
      ),
    };
  }, [getUrlForApp, navigateTo]);

  return (
    <>
      <FormattedMessage
        id="xpack.securitySolution.endpoint.ingestManager.editPackagePolicy.trustedAppsMessage"
        defaultMessage="Click {link} to view global Trusted Applications"
        values={{
          link: (
            <LinkToApp
              data-test-subj="viewTrustedApps"
              appId={MANAGEMENT_APP_ID}
              appPath={trustedAppsListUrl}
              appState={trustedAppsListRouteState}
            >
              <FormattedMessage
                id="xpack.securitySolution.endpoint.ingestManager.editPackagePolicy.trustedAppsMessageLinkLabel"
                defaultMessage="here"
              />
            </LinkToApp>
          ),
        }}
      />
    </>
  );
});
TrustedAppsMessage.displayName = 'TrustedAppsMessage';
