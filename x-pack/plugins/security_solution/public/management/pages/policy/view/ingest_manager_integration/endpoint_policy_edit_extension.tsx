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
  pagePathGetters,
  PackagePolicyEditExtensionComponentProps,
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
export const EndpointPolicyEditExtension = memo<PackagePolicyEditExtensionComponentProps>(
  ({ policy }) => {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut data-test-subj="endpointPackagePolicy_edit" iconType="iInCircle">
          <EuiText size="s">
            <EditFlowMessage agentPolicyId={policy.policy_id} integrationPolicyId={policy.id} />
          </EuiText>
        </EuiCallOut>
      </>
    );
  }
);
EndpointPolicyEditExtension.displayName = 'EndpointPolicyEditExtension';

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
      'fleet',
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
          ? `${getUrlForApp('fleet')}${navigateBackToIngest[1].path}`
          : undefined,
        onBackButtonNavigateTo: navigateBackToIngest,
        backButtonLabel: i18n.translate(
          'xpack.securitySolution.endpoint.fleet.editPackagePolicy.trustedAppsMessageReturnBackLabel',
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
          id="xpack.securitySolution.endpoint.fleet.editPackagePolicy.menuButton"
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
          id="xpack.securitySolution.endpoint.fleet.editPackagePolicy.actionSecurityPolicy"
          defaultMessage="Edit Policy"
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="trustedApps"
        onClick={handleTrustedAppsAction}
        data-test-subj="trustedAppsAction"
      >
        <FormattedMessage
          id="xpack.securitySolution.endpoint.fleet.editPackagePolicy.actionTrustedApps"
          defaultMessage="Edit Trusted Applications"
        />
      </EuiContextMenuItem>,
    ];
  }, [handleSecurityPolicyAction, handleTrustedAppsAction]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.fleet.editPackagePolicy.message"
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
