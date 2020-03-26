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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { usePolicyDetailsSelector } from './policy_hooks';
import {
  policyDetails,
  selectAgentStatusSummary,
  updateStatus,
  isLoading,
} from '../../store/policy_details/selectors';
import { WindowsEventing } from './policy_forms/eventing/windows';
import { PageView } from '../../components/page_view';
import { AppAction } from '../../types';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { AgentsSummary } from './agents_summary';

export const PolicyDetails = React.memo(() => {
  const dispatch = useDispatch<(action: AppAction) => void>();
  const { notifications } = useKibana();

  // Store values
  const policyItem = usePolicyDetailsSelector(policyDetails);
  const agentStatusSummary = usePolicyDetailsSelector(selectAgentStatusSummary);
  const policyUpdateStatus = usePolicyDetailsSelector(updateStatus);
  const isPolicyLoading = usePolicyDetailsSelector(isLoading);

  // Local state
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const policyName = policyItem?.name ?? '';

  // Handle showing udpate statuses
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
  }, [notifications.toasts, policyItem, policyName, policyUpdateStatus]);

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

  const headerLeftContent =
    policyItem?.name ??
    i18n.translate('xpack.endpoint.policy.details.notFound', {
      defaultMessage: 'Policy Not Found',
    });

  const headerRightContent = (
    <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
      <EuiFlexItem grow={false}>
        <AgentsSummary {...agentStatusSummary} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty>
          <FormattedMessage id="xpack.endpoint.policy.details.cancel" defaultMessage="Cancel" />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          fill={true}
          iconType="save"
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
          hostCount={agentStatusSummary.total}
          onCancel={handleSaveCancel}
          onConfirm={handleSaveConfirmation}
        />
      )}
      <PageView
        data-test-subj="policyDetailsPage"
        headerLeft={headerLeftContent}
        headerRight={headerRightContent}
      >
        <EuiText size="xs" color="subdued">
          <h4>
            <FormattedMessage
              id="xpack.endpoint.policy.details.settings"
              defaultMessage="Settings"
            />
          </h4>
        </EuiText>
        <EuiSpacer size="xs" />
        <WindowsEventing />
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
