/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
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
import { useDispatch } from 'react-redux';
import {
  pagePathGetters,
  PackagePolicyEditExtensionComponentProps,
  NewPackagePolicy,
} from '../../../../../../../fleet/public';
import { getPolicyDetailPath, getTrustedAppsListPath } from '../../../../common/routing';
import { MANAGEMENT_APP_ID } from '../../../../common/constants';
import {
  PolicyDetailsRouteState,
  TrustedAppsListPageRouteState,
} from '../../../../../../common/endpoint/types';
import { useKibana } from '../../../../../common/lib/kibana';
import { useNavigateToAppEventHandler } from '../../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { PolicyDetailsForm } from '../policy_details_form';
import { AppAction } from '../../../../../common/store/actions';
import { usePolicyDetailsSelector } from '../policy_hooks';
import { policyDetailsForUpdate } from '../../store/policy_details/selectors';

/**
 * Exports Endpoint-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const EndpointPolicyEditExtension = memo<PackagePolicyEditExtensionComponentProps>(
  ({ policy, onChange }) => {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut data-test-subj="endpointPackagePolicy_edit" iconType="iInCircle">
          <EuiText size="s">
            <EditFlowMessage agentPolicyId={policy.policy_id} integrationPolicyId={policy.id} />
          </EuiText>
        </EuiCallOut>
        <EuiSpacer size="m" />
        <WrappedPolicyDetailsForm policyId={policy.id} onChange={onChange} />
      </>
    );
  }
);
EndpointPolicyEditExtension.displayName = 'EndpointPolicyEditExtension';

const WrappedPolicyDetailsForm = memo<{
  policyId: string;
  onChange: PackagePolicyEditExtensionComponentProps['onChange'];
}>(({ policyId, onChange }) => {
  const dispatch = useDispatch<(a: AppAction) => void>();
  const updatedPolicy = usePolicyDetailsSelector(policyDetailsForUpdate);
  const [, setLastUpdatedPolicy] = useState(updatedPolicy);

  // When the form is initially displayed, trigger the Redux middleware which is based on
  // the location information stored via the `userChangedUrl` action.
  useEffect(() => {
    dispatch({
      type: 'userChangedUrl',
      payload: {
        hash: '',
        pathname: getPolicyDetailPath(policyId, ''),
        search: '',
      },
    });

    // When form is unloaded, reset the redux store
    return () => {
      dispatch({
        type: 'userChangedUrl',
        payload: {
          hash: '',
          pathname: '/',
          search: '',
        },
      });
    };
  }, [dispatch, policyId]);

  useEffect(() => {
    // Currently, the `onChange` callback provided by the fleet UI extension is regenerated every
    // time the policy data is updated, which means this will go into a continious loop if we don't
    // actually check to see if an update should be reported back to fleet
    setLastUpdatedPolicy((prevState) => {
      if (prevState === updatedPolicy) {
        return prevState;
      }

      if (updatedPolicy) {
        onChange({
          isValid: true,
          // send up only the updated policy data which is stored in the `inputs` section.
          // All other attributes (like name, id) are updated from the Fleet form, so we want to
          // ensure we don't override it.
          updatedPolicy: {
            // Casting is needed due to the use of `Immutable<>` in our store data
            inputs: (updatedPolicy.inputs as unknown) as NewPackagePolicy['inputs'],
          },
        });
      }

      return updatedPolicy;
    });
  }, [onChange, updatedPolicy]);

  return (
    <div data-test-subj="endpointIntegrationPolicyForm">
      <PolicyDetailsForm />
    </div>
  );
});
WrappedPolicyDetailsForm.displayName = 'WrappedPolicyDetailsForm';

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
  }, [handleTrustedAppsAction]);

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
