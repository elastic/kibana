/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiLoadingSpinner,
  EuiBottomBar,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { ApplicationStart } from 'kibana/public';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import {
  policyDetails,
  agentStatusSummary,
  updateStatus,
  isLoading,
} from '../../../store/policy_details/selectors';

import { toMountPoint } from '../../../../../../../../../../src/plugins/kibana_react/public';
import { useToasts, useKibana } from '../../../../../../common/lib/kibana';
import { AppAction } from '../../../../../../common/store/actions';
import { SpyRoute } from '../../../../../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../../../../app/types';
import { getEndpointListPath } from '../../../../../common/routing';
import { useNavigateToAppEventHandler } from '../../../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { APP_UI_ID } from '../../../../../../../common/constants';
import { PolicyDetailsRouteState } from '../../../../../../../common/endpoint/types';
import { SecuritySolutionPageWrapper } from '../../../../../../common/components/page_wrapper';
import { PolicyDetailsForm } from '../../policy_details_form';
import { ConfirmUpdate } from './policy_form_confirm_update';

export const PolicyFormLayout = React.memo(() => {
  const dispatch = useDispatch<(action: AppAction) => void>();
  const {
    services: {
      theme,
      application: { navigateToApp },
    },
  } = useKibana();
  const toasts = useToasts();
  const { state: locationRouteState } = useLocation<PolicyDetailsRouteState>();

  // Store values
  const policyItem = usePolicyDetailsSelector(policyDetails);
  const policyAgentStatusSummary = usePolicyDetailsSelector(agentStatusSummary);
  const policyUpdateStatus = usePolicyDetailsSelector(updateStatus);
  const isPolicyLoading = usePolicyDetailsSelector(isLoading);

  // Local state
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [routeState, setRouteState] = useState<PolicyDetailsRouteState>();
  const policyName = policyItem?.name ?? '';
  const hostListRouterPath = getEndpointListPath({ name: 'endpointList' });

  const routingOnCancelNavigateTo = routeState?.onCancelNavigateTo;
  const navigateToAppArguments = useMemo((): Parameters<ApplicationStart['navigateToApp']> => {
    return routingOnCancelNavigateTo ?? [APP_UI_ID, { path: hostListRouterPath }];
  }, [hostListRouterPath, routingOnCancelNavigateTo]);

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
            </span>,
            { theme$: theme.theme$ }
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
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          text: policyUpdateStatus.error!.message,
        });
      }
    }
  }, [navigateToApp, toasts, policyName, policyUpdateStatus, routeState, theme.theme$]);

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
      <SecuritySolutionPageWrapper noTimeline>
        {isPolicyLoading ? <EuiLoadingSpinner size="xl" /> : null}
        <SpyRoute pageName={SecurityPageName.administration} />
      </SecuritySolutionPageWrapper>
    );
  }

  return (
    <>
      {showConfirm && (
        <ConfirmUpdate
          hostCount={policyAgentStatusSummary?.total ?? 0}
          onCancel={handleSaveCancel}
          onConfirm={handleSaveConfirmation}
        />
      )}
      <PolicyDetailsForm />
      <EuiSpacer size="xxl" />
      <EuiBottomBar paddingSize="s">
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="ghost"
              onClick={handleCancelOnClick}
              data-test-subj="policyDetailsCancelButton"
            >
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
      </EuiBottomBar>
    </>
  );
});

PolicyFormLayout.displayName = 'PolicyFormLayout';
