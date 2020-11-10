/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiCallOut,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanelProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  CustomConfigurePackagePolicyContent,
  CustomConfigurePackagePolicyProps,
  pagePathGetters,
} from '../../../../../../../fleet/public';
import { getPolicyDetailPath, getTrustedAppsListPath } from '../../../../common/routing';
import { MANAGEMENT_APP_ID } from '../../../../common/constants';
import {
  PolicyDetailsRouteState,
  TrustedAppsListPageRouteState,
} from '../../../../../../common/endpoint/types';
import { useKibana } from '../../../../../common/lib/kibana';
import { useNavigateToAppEventHandler } from '../../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';

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
                <EditFlowMessage
                  agentPolicyId={agentPolicyId}
                  integrationPolicyId={packagePolicyId!}
                />
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

const EditFlowMessage = memo<{
  agentPolicyId: string;
  integrationPolicyId: string;
}>(({ agentPolicyId, integrationPolicyId }) => {
  const {
    services: {
      application: { getUrlForApp },
    },
  } = useKibana();

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const navigateBackToIngest = useMemo<
    PolicyDetailsRouteState['onSaveNavigateTo'] &
      PolicyDetailsRouteState['onCancelNavigateTo'] &
      TrustedAppsListPageRouteState['onBackButtonNavigateTo']
  >(() => {
    return [
      'ingestManager',
      {
        path: `#${pagePathGetters.edit_integration({
          policyId: agentPolicyId,
          packagePolicyId: integrationPolicyId!,
        })}`,
      },
    ];
  }, [agentPolicyId, integrationPolicyId]);

  const handleClosePopup = useCallback(() => setIsMenuOpen(false), []);

  const handleSecurityPolicyAction = useNavigateToAppEventHandler<PolicyDetailsRouteState>(
    MANAGEMENT_APP_ID,
    {
      path: getPolicyDetailPath(integrationPolicyId),
      state: {
        onSaveNavigateTo: navigateBackToIngest,
        onCancelNavigateTo: navigateBackToIngest,
      },
    }
  );

  const handleTrustedAppsAction = useNavigateToAppEventHandler<TrustedAppsListPageRouteState>(
    MANAGEMENT_APP_ID,
    {
      path: getTrustedAppsListPath(),
      state: {
        backButtonUrl: navigateBackToIngest[1]?.path
          ? `${getUrlForApp('ingestManager')}${navigateBackToIngest[1].path}`
          : undefined,
        onBackButtonNavigateTo: navigateBackToIngest,
        backButtonLabel: i18n.translate(
          'xpack.securitySolution.endpoint.ingestManager.editPackagePolicy.trustedAppsMessageReturnBackLabel',
          { defaultMessage: 'Back to Edit Integration' }
        ),
      },
    }
  );

  const menuButton = useMemo(() => {
    return (
      <EuiButton
        size="s"
        iconType="arrowDown"
        iconSide="right"
        onClick={() => setIsMenuOpen((prevState) => !prevState)}
        data-test-subj="endpointActions"
      >
        <FormattedMessage
          id="xpack.securitySolution.endpoint.ingestManager.editPackagePolicy.menuButton"
          defaultMessage="Actions"
        />
      </EuiButton>
    );
  }, []);

  const actionItems = useMemo<EuiContextMenuPanelProps['items']>(() => {
    return [
      <EuiContextMenuItem
        key="policyDetails"
        onClick={handleSecurityPolicyAction}
        data-test-subj="securityPolicy"
      >
        <FormattedMessage
          id="xpack.securitySolution.endpoint.ingestManager.editPackagePolicy.actionSecurityPolicy"
          defaultMessage="Edit Policy"
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="trustedApps"
        onClick={handleTrustedAppsAction}
        data-test-subj="trustedAppsAction"
      >
        <FormattedMessage
          id="xpack.securitySolution.endpoint.ingestManager.editPackagePolicy.actionTrustedApps"
          defaultMessage="Edit Trusted Applications"
        />
      </EuiContextMenuItem>,
    ];
  }, [handleSecurityPolicyAction, handleTrustedAppsAction]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.ingestManager.editPackagePolicy.message"
          defaultMessage="Access additional configuration options from the action menu"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={menuButton}
          isOpen={isMenuOpen}
          closePopover={handleClosePopup}
          anchorPosition="downRight"
          panelPaddingSize="s"
        >
          <EuiContextMenuPanel data-test-subj="endpointActionsMenuPanel" items={actionItems} />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
EditFlowMessage.displayName = 'EditFlowMessage';
