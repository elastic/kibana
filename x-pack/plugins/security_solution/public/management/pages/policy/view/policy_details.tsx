/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiSpacer,
  EuiOverlayMask,
  EuiConfirmModal,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiHideFor,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { ApplicationStart } from 'kibana/public';
import { usePolicyDetailsSelector } from './policy_hooks';
import {
  policyDetails,
  agentStatusSummary,
  updateStatus,
  isLoading,
  apiError,
} from '../store/policy_details/selectors';
import { useKibana, toMountPoint } from '../../../../../../../../src/plugins/kibana_react/public';
import { AgentsSummary } from './agents_summary';
import { VerticalDivider } from './vertical_divider';
import { WindowsEvents, MacEvents, LinuxEvents } from './policy_forms/events';
import { MalwareProtections } from './policy_forms/protections/malware';
import { useToasts } from '../../../../common/lib/kibana';
import { AppAction } from '../../../../common/store/actions';
import { useNavigateByRouterEventHandler } from '../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { PageViewHeaderTitle } from '../../../../common/components/endpoint/page_view';
import { ManagementPageView } from '../../../components/management_page_view';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../../app/types';
import { getHostListPath } from '../../../common/routing';
import { useFormatUrl } from '../../../../common/components/link_to';
import { useNavigateToAppEventHandler } from '../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { MANAGEMENT_APP_ID } from '../../../common/constants';
import { PolicyDetailsRouteState } from '../../../../../common/endpoint/types';

export const PolicyDetails = React.memo(() => {
  const dispatch = useDispatch<(action: AppAction) => void>();
  const {
    services: {
      application: { navigateToApp },
    },
  } = useKibana();
  const toasts = useToasts();
  const { formatUrl } = useFormatUrl(SecurityPageName.administration);
  const { state: locationRouteState } = useLocation<PolicyDetailsRouteState>();

  // Store values
  const policyItem = usePolicyDetailsSelector(policyDetails);
  const policyAgentStatusSummary = usePolicyDetailsSelector(agentStatusSummary);
  const policyUpdateStatus = usePolicyDetailsSelector(updateStatus);
  const isPolicyLoading = usePolicyDetailsSelector(isLoading);
  const policyApiError = usePolicyDetailsSelector(apiError);

  // Local state
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [routeState, setRouteState] = useState<PolicyDetailsRouteState>();
  const policyName = policyItem?.name ?? '';
  const hostListRouterPath = getHostListPath({ name: 'hostList' });

  // Handle showing update statuses
  useEffect(() => {
    if (policyUpdateStatus) {
      if (policyUpdateStatus.success) {
        toasts.addSuccess({
          title: i18n.translate(
            'xpack.securitySolution.endpoint.policy.details.updateSuccessTitle',
            {
              defaultMessage: 'Success!',
            }
          ),
          text: toMountPoint(
            <span data-test-subj="policyDetailsSuccessMessage">
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.details.updateSuccessMessage"
                defaultMessage="Integration {name} has been updated."
                values={{ name: policyName }}
              />
            </span>
          ),
        });

        if (routeState && routeState.onSaveNavigateTo) {
          navigateToApp(...routeState.onSaveNavigateTo);
        }
      } else {
        toasts.addDanger({
          title: i18n.translate('xpack.securitySolution.endpoint.policy.details.updateErrorTitle', {
            defaultMessage: 'Failed!',
          }),
          text: policyUpdateStatus.error!.message,
        });
      }
    }
  }, [navigateToApp, toasts, policyName, policyUpdateStatus, routeState]);

  const handleBackToListOnClick = useNavigateByRouterEventHandler(hostListRouterPath);

  const navigateToAppArguments = useMemo((): Parameters<ApplicationStart['navigateToApp']> => {
    return routeState?.onCancelNavigateTo ?? [MANAGEMENT_APP_ID, { path: hostListRouterPath }];
  }, [hostListRouterPath, routeState?.onCancelNavigateTo]);
  const handleCancelOnClick = useNavigateToAppEventHandler(...navigateToAppArguments);

  const handleSaveOnClick = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const handleSaveConfirmation = useCallback(() => {
    dispatch({
      type: 'userClickedPolicyDetailsSaveButton',
    });
    setShowConfirm(false);
  }, [dispatch]);

  const handleSaveCancel = useCallback(() => {
    setShowConfirm(false);
  }, []);

  useEffect(() => {
    if (!routeState && locationRouteState) {
      setRouteState(locationRouteState);
    }
  }, [locationRouteState, routeState]);

  // Before proceeding - check if we have a policy data.
  // If not, and we are still loading, show spinner.
  // Else, if we have an error, then show error on the page.
  if (!policyItem) {
    return (
      <ManagementPageView viewType="details">
        {isPolicyLoading ? (
          <EuiLoadingSpinner size="xl" />
        ) : policyApiError ? (
          <EuiCallOut color="danger" title={policyApiError?.error}>
            <span data-test-subj="policyDetailsIdNotFoundMessage">{policyApiError?.message}</span>
          </EuiCallOut>
        ) : null}
        <SpyRoute pageName={SecurityPageName.administration} />
      </ManagementPageView>
    );
  }

  const headerLeftContent = (
    <div>
      {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
      <EuiButtonEmpty
        iconType="arrowLeft"
        contentProps={{ style: { paddingLeft: '0' } }}
        onClick={handleBackToListOnClick}
        href={formatUrl(hostListRouterPath)}
      >
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.details.backToListTitle"
          defaultMessage="Back to endpoint hosts"
        />
      </EuiButtonEmpty>
      <PageViewHeaderTitle className="eui-textTruncate">{policyItem.name}</PageViewHeaderTitle>
    </div>
  );

  const headerRightContent = (
    <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
      <EuiFlexItem grow={false}>
        <AgentsSummary
          total={policyAgentStatusSummary?.total ?? 0}
          online={policyAgentStatusSummary?.online ?? 0}
          offline={policyAgentStatusSummary?.offline ?? 0}
          error={policyAgentStatusSummary?.error ?? 0}
        />
      </EuiFlexItem>
      <EuiHideFor sizes={['xs', 's']}>
        <EuiFlexItem>
          <VerticalDivider spacing="l" />
        </EuiFlexItem>
      </EuiHideFor>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={handleCancelOnClick} data-test-subj="policyDetailsCancelButton">
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.details.cancel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          fill={true}
          iconType="save"
          data-test-subj="policyDetailsSaveButton"
          onClick={handleSaveOnClick}
          isLoading={isPolicyLoading}
        >
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.details.save"
            defaultMessage="Save"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      {showConfirm && (
        <ConfirmUpdate
          hostCount={policyAgentStatusSummary?.total ?? 0}
          onCancel={handleSaveCancel}
          onConfirm={handleSaveConfirmation}
        />
      )}
      <ManagementPageView
        viewType="details"
        data-test-subj="policyDetailsPage"
        headerLeft={headerLeftContent}
        headerRight={headerRightContent}
      >
        <EuiText size="xs" color="subdued">
          <h4>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.details.protections"
              defaultMessage="Protections"
            />
          </h4>
        </EuiText>
        <EuiSpacer size="xs" />
        <MalwareProtections />
        <EuiSpacer size="l" />
        <EuiText size="xs" color="subdued">
          <h4>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.details.settings"
              defaultMessage="Settings"
            />
          </h4>
        </EuiText>
        <EuiSpacer size="xs" />
        <WindowsEvents />
        <EuiSpacer size="l" />
        <MacEvents />
        <EuiSpacer size="l" />
        <LinuxEvents />
      </ManagementPageView>
      <SpyRoute pageName={SecurityPageName.administration} />
    </>
  );
});

PolicyDetails.displayName = 'PolicyDetails';

const ConfirmUpdate = React.memo<{
  hostCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}>(({ hostCount, onCancel, onConfirm }) => {
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        data-test-subj="policyDetailsConfirmModal"
        title={i18n.translate(
          'xpack.securitySolution.endpoint.policy.details.updateConfirm.title',
          {
            defaultMessage: 'Save and deploy changes',
          }
        )}
        onCancel={onCancel}
        onConfirm={onConfirm}
        confirmButtonText={i18n.translate(
          'xpack.securitySolution.endpoint.policy.details.updateConfirm.confirmButtonTitle',
          {
            defaultMessage: 'Save and deploy changes',
          }
        )}
        cancelButtonText={i18n.translate(
          'xpack.securitySolution.endpoint.policy.details.updateConfirm.cancelButtonTitle',
          {
            defaultMessage: 'Cancel',
          }
        )}
      >
        {hostCount > 0 && (
          <>
            <EuiCallOut
              data-test-subj="policyDetailsWarningCallout"
              title={i18n.translate(
                'xpack.securitySolution.endpoint.policy.details.updateConfirm.warningTitle',
                {
                  defaultMessage:
                    'This action will update {hostCount, plural, one {# host} other {# hosts}}',
                  values: { hostCount },
                }
              )}
            >
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.details.updateConfirm.warningMessage"
                defaultMessage="Saving these changes will apply updates to all endpoints assigned to this agent configuration."
              />
            </EuiCallOut>
            <EuiSpacer size="xl" />
          </>
        )}
        <p>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.details.updateConfirm.message"
            defaultMessage="This action cannot be undone. Are you sure you wish to continue?"
          />
        </p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
});

ConfirmUpdate.displayName = 'ConfirmUpdate';
