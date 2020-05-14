/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState } from 'react';
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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { usePolicyDetailsSelector } from './policy_hooks';
import {
  policyDetails,
  agentStatusSummary,
  updateStatus,
  isLoading,
  apiError,
} from '../../store/policy_details/selectors';
import { PageView, PageViewHeaderTitle } from '../components/page_view';
import { AppAction } from '../../types';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { AgentsSummary } from './agents_summary';
import { VerticalDivider } from './vertical_divider';
import { WindowsEvents, MacEvents, LinuxEvents } from './policy_forms/events';
import { MalwareProtections } from './policy_forms/protections/malware';
import { useNavigateByRouterEventHandler } from '../hooks/use_navigate_by_router_event_handler';

export const PolicyDetails = React.memo(() => {
  const dispatch = useDispatch<(action: AppAction) => void>();
  const { notifications, services } = useKibana();

  // Store values
  const policyItem = usePolicyDetailsSelector(policyDetails);
  const policyAgentStatusSummary = usePolicyDetailsSelector(agentStatusSummary);
  const policyUpdateStatus = usePolicyDetailsSelector(updateStatus);
  const isPolicyLoading = usePolicyDetailsSelector(isLoading);
  const policyApiError = usePolicyDetailsSelector(apiError);

  // Local state
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const policyName = policyItem?.name ?? '';

  // Handle showing update statuses
  useEffect(() => {
    if (policyUpdateStatus) {
      if (policyUpdateStatus.success) {
        notifications.toasts.success({
          toastLifeTimeMs: 10000,
          title: i18n.translate('xpack.endpoint.policy.details.updateSuccessTitle', {
            defaultMessage: 'Success!',
          }),
          body: (
            <FormattedMessage
              id="xpack.endpoint.policy.details.updateSuccessMessage"
              defaultMessage="Policy {name} has been updated."
              values={{ name: policyName }}
            />
          ),
        });
      } else {
        notifications.toasts.danger({
          toastLifeTimeMs: 10000,
          title: i18n.translate('xpack.endpoint.policy.details.updateErrorTitle', {
            defaultMessage: 'Failed!',
          }),
          body: <>{policyUpdateStatus.error!.message}</>,
        });
      }
    }
  }, [notifications.toasts, policyName, policyUpdateStatus]);

  const handleBackToListOnClick = useNavigateByRouterEventHandler('/policy');

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

  // Before proceeding - check if we have a policy data.
  // If not, and we are still loading, show spinner.
  // Else, if we have an error, then show error on the page.
  if (!policyItem) {
    return (
      <PageView viewType="details">
        {isPolicyLoading ? (
          <EuiLoadingSpinner size="xl" />
        ) : policyApiError ? (
          <EuiCallOut color="danger" title={policyApiError?.error}>
            {policyApiError?.message}
          </EuiCallOut>
        ) : null}
      </PageView>
    );
  }

  const headerLeftContent = (
    <div>
      {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
      <EuiButtonEmpty
        iconType="arrowLeft"
        contentProps={{ style: { paddingLeft: '0' } }}
        onClick={handleBackToListOnClick}
        href={services.http.basePath.get() + '/app/endpoint/policy'}
      >
        <FormattedMessage
          id="xpack.endpoint.policy.details.backToListTitle"
          defaultMessage="Back to policy list"
        />
      </EuiButtonEmpty>
      <PageViewHeaderTitle>{policyItem.name}</PageViewHeaderTitle>
    </div>
  );

  const headerRightContent = (
    <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
      <EuiFlexItem grow={false}>
        <AgentsSummary {...policyAgentStatusSummary} />
      </EuiFlexItem>
      <EuiFlexItem>
        <VerticalDivider spacing="l" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          onClick={handleBackToListOnClick}
          data-test-subj="policyDetailsCancelButton"
        >
          <FormattedMessage id="xpack.endpoint.policy.details.cancel" defaultMessage="Cancel" />
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
          <FormattedMessage id="xpack.endpoint.policy.details.save" defaultMessage="Save" />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      {showConfirm && (
        <ConfirmUpdate
          hostCount={policyAgentStatusSummary.total}
          onCancel={handleSaveCancel}
          onConfirm={handleSaveConfirmation}
        />
      )}
      <PageView
        viewType="details"
        data-test-subj="policyDetailsPage"
        headerLeft={headerLeftContent}
        headerRight={headerRightContent}
      >
        <EuiText size="xs" color="subdued">
          <h4>
            <FormattedMessage
              id="xpack.endpoint.policy.details.protections"
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
              id="xpack.endpoint.policy.details.settings"
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
      </PageView>
    </>
  );
});

const ConfirmUpdate = React.memo<{
  hostCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}>(({ hostCount, onCancel, onConfirm }) => {
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        data-test-subj="policyDetailsConfirmModal"
        title={i18n.translate('xpack.endpoint.policy.details.updateConfirm.title', {
          defaultMessage: 'Save and deploy changes',
        })}
        onCancel={onCancel}
        onConfirm={onConfirm}
        confirmButtonText={i18n.translate(
          'xpack.endpoint.policy.details.updateConfirm.confirmButtonTitle',
          {
            defaultMessage: 'Save and deploy changes',
          }
        )}
        cancelButtonText={i18n.translate(
          'xpack.endpoint.policy.details.updateConfirm.cancelButtonTitle',
          {
            defaultMessage: 'Cancel',
          }
        )}
      >
        {hostCount > 0 && (
          <>
            <EuiCallOut
              data-test-subj="policyDetailsWarningCallout"
              title={i18n.translate('xpack.endpoint.policy.details.updateConfirm.warningTitle', {
                defaultMessage:
                  'This action will update {hostCount, plural, one {# host} other {# hosts}}',
                values: { hostCount },
              })}
            >
              <FormattedMessage
                id="xpack.endpoint.policy.details.updateConfirm.warningMessage"
                defaultMessage="Saving these changes will apply the updates to all active endpoints assigned to this policy"
              />
            </EuiCallOut>
            <EuiSpacer size="xl" />
          </>
        )}
        <p>
          <FormattedMessage
            id="xpack.endpoint.policy.details.updateConfirm.message"
            defaultMessage="This action cannot be undone. Are you sure you wish to continue?"
          />
        </p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
});
