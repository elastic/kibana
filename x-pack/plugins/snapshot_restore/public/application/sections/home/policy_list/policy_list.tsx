/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiPageContent, EuiEmptyPrompt, EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';

import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';

import {
  PageLoading,
  PageError,
  Error,
  WithPrivileges,
  NotAuthorizedSection,
  useExecutionContext,
} from '../../../../shared_imports';

import { SlmPolicy } from '../../../../../common/types';
import { APP_SLM_CLUSTER_PRIVILEGES } from '../../../../../common';
import { BASE_PATH, UIM_POLICY_LIST_LOAD } from '../../../constants';
import { useDecodedParams } from '../../../lib';
import { useLoadPolicies, useLoadRetentionSettings } from '../../../services/http';
import { linkToAddPolicy, linkToPolicy } from '../../../services/navigation';
import { useAppContext, useServices } from '../../../app_context';

import { PolicyDetails } from './policy_details';
import { PolicyTable } from './policy_table';
import { PolicyRetentionSchedule } from './policy_retention_schedule';

interface MatchParams {
  policyName?: SlmPolicy['name'];
}

export const PolicyList: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  history,
}) => {
  const { policyName } = useDecodedParams<MatchParams>();
  const {
    error,
    isLoading,
    data: { policies } = {
      policies: undefined,
    },
    resendRequest: reload,
  } = useLoadPolicies();

  const { uiMetricService } = useServices();
  const { core } = useAppContext();

  // Load retention cluster settings
  const {
    isLoading: isLoadingRetentionSettings,
    error: retentionSettingsError,
    data: retentionSettings,
    resendRequest: reloadRetentionSettings,
  } = useLoadRetentionSettings();

  const openPolicyDetailsUrl = (newPolicyName: SlmPolicy['name']): string => {
    return linkToPolicy(newPolicyName);
  };

  const closePolicyDetails = () => {
    history.push(`${BASE_PATH}/policies`);
  };

  const onPolicyDeleted = (policiesDeleted: Array<SlmPolicy['name']>): void => {
    if (policyName && policiesDeleted.includes(policyName)) {
      closePolicyDetails();
    }
    if (policiesDeleted.length) {
      reload();
    }
  };

  const onPolicyExecuted = () => {
    reload();
  };

  // Track component loaded
  useEffect(() => {
    uiMetricService.trackUiMetric(UIM_POLICY_LIST_LOAD);
  }, [uiMetricService]);

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'snapshotRestorePolicyTab',
  });

  let content: JSX.Element;

  if (isLoading) {
    content = (
      <PageLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.policyList.loadingPoliciesDescription"
          defaultMessage="Loading policies…"
        />
      </PageLoading>
    );
  } else if (error) {
    content = (
      <PageError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.policyList.LoadingPoliciesErrorMessage"
            defaultMessage="Error loading policies"
          />
        }
        error={error as Error}
      />
    );
  } else if (policies && policies.length === 0) {
    content = (
      <EuiPageContent
        hasShadow={false}
        paddingSize="none"
        verticalPosition="center"
        horizontalPosition="center"
      >
        <EuiEmptyPrompt
          iconType="managementApp"
          title={
            <h1>
              <FormattedMessage
                id="xpack.snapshotRestore.policyList.emptyPromptTitle"
                defaultMessage="Create your first snapshot policy"
              />
            </h1>
          }
          body={
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.snapshotRestore.policyList.emptyPromptDescription"
                  defaultMessage="A policy automates the creation and deletion of snapshots."
                />
              </p>
            </Fragment>
          }
          actions={
            <EuiButton
              {...reactRouterNavigate(history, linkToAddPolicy())}
              fill
              iconType="plusInCircle"
              data-test-subj="createPolicyButton"
            >
              <FormattedMessage
                id="xpack.snapshotRestore.createPolicyButton"
                defaultMessage="Create a policy"
              />
            </EuiButton>
          }
          data-test-subj="emptyPrompt"
        />
      </EuiPageContent>
    );
  } else {
    const policySchedules = policies.map((policy: SlmPolicy) => policy.schedule);
    const hasDuplicateSchedules = policySchedules.length > new Set(policySchedules).size;
    const hasRetention = Boolean(policies.find((policy: SlmPolicy) => policy.retention));

    content = (
      <section data-test-subj="policyList">
        {hasDuplicateSchedules ? (
          <Fragment>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.snapshotRestore.policyScheduleWarningTitle"
                  defaultMessage="Two or more policies have the same schedule"
                />
              }
              color="warning"
              iconType="alert"
            >
              <FormattedMessage
                id="xpack.snapshotRestore.policyScheduleWarningDescription"
                defaultMessage="Only one snapshot can be taken at a time. To avoid snapshot failures, edit or delete the policies."
              />
            </EuiCallOut>
            <EuiSpacer />
          </Fragment>
        ) : null}

        {hasRetention ? (
          <PolicyRetentionSchedule
            retentionSettings={retentionSettings}
            onRetentionScheduleUpdated={reloadRetentionSettings}
            isLoading={isLoadingRetentionSettings}
            error={retentionSettingsError}
          />
        ) : null}

        <PolicyTable
          policies={policies || []}
          reload={reload}
          openPolicyDetailsUrl={openPolicyDetailsUrl}
          onPolicyDeleted={onPolicyDeleted}
          onPolicyExecuted={onPolicyExecuted}
        />
      </section>
    );
  }

  return (
    <WithPrivileges privileges={APP_SLM_CLUSTER_PRIVILEGES.map((name) => `cluster.${name}`)}>
      {({ hasPrivileges, privilegesMissing }) =>
        hasPrivileges ? (
          <>
            {policyName ? (
              <PolicyDetails
                policyName={policyName}
                onClose={closePolicyDetails}
                onPolicyDeleted={onPolicyDeleted}
                onPolicyExecuted={onPolicyExecuted}
              />
            ) : null}
            {content}
          </>
        ) : (
          <NotAuthorizedSection
            title={
              <FormattedMessage
                id="xpack.snapshotRestore.policyList.deniedPrivilegeTitle"
                defaultMessage="You're missing cluster privileges"
              />
            }
            message={
              <FormattedMessage
                id="xpack.snapshotRestore.policyList.deniedPrivilegeDescription"
                defaultMessage="To manage Snapshot Lifecycle Policies, you must have {privilegesCount,
                  plural, one {this cluster privilege} other {these cluster privileges}}: {missingPrivileges}."
                values={{
                  missingPrivileges: privilegesMissing.cluster!.join(', '),
                  privilegesCount: privilegesMissing.cluster!.length,
                }}
              />
            }
          />
        )
      }
    </WithPrivileges>
  );
};
