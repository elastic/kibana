/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { usePolicyDetailsSelector } from './policy_hooks';
import {
  policyDetails,
  selectAgentStatusSummary,
  selectUpdateApiError,
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

  const policyItem = usePolicyDetailsSelector(policyDetails);
  const agentStatusSummary = usePolicyDetailsSelector(selectAgentStatusSummary);
  const updateApiError = usePolicyDetailsSelector(selectUpdateApiError);
  const isPolicyLoading = usePolicyDetailsSelector(isLoading);

  useEffect(() => {
    if (updateApiError) {
      notifications.toasts.danger({
        toastLifeTimeMs: 10000,
        body: <>{updateApiError?.message}</>,
      });
    }
  }, [notifications.toasts, updateApiError]);

  const handleSaveOnClick = useCallback(() => {
    dispatch({
      type: 'userClickedPolicyDetailsSaveButton',
    });
  }, [dispatch]);

  const headerLeftContent =
    policyItem?.name ??
    i18n.translate('xpack.endpoint.policyDetails.notFound', {
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
    <PageView
      data-test-subj="policyDetailsPage"
      headerLeft={headerLeftContent}
      headerRight={headerRightContent}
    >
      <EuiText size="xs" color="subdued">
        <h4>
          <FormattedMessage id="xpack.endpoint.policy.details.settings" defaultMessage="Settings" />
        </h4>
      </EuiText>
      <EuiSpacer size="xs" />
      <WindowsEventing />
    </PageView>
  );
});
