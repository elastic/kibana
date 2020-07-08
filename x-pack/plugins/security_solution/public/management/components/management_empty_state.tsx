/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, MouseEvent, CSSProperties } from 'react';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButton,
  EuiSteps,
  EuiTitle,
  EuiSelectable,
  EuiSelectableMessage,
  EuiSelectableProps,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

const TEXT_ALIGN_CENTER: CSSProperties = Object.freeze({
  textAlign: 'center',
});

interface ManagementStep {
  title: string;
  children: JSX.Element;
}

const PolicyEmptyState = React.memo<{
  loading: boolean;
  onActionClick: (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  actionDisabled?: boolean;
}>(({ loading, onActionClick, actionDisabled }) => {
  const policySteps = useMemo(
    () => [
      {
        title: i18n.translate('xpack.securitySolution.endpoint.policyList.stepOneTitle', {
          defaultMessage: 'Head over to Ingest Manager.',
        }),
        children: (
          <EuiText color="subdued" size="xs">
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policyList.stepOne"
              defaultMessage="Here, you’ll add the Elastic Endpoint Security Integration to your Agent Configuration."
            />
          </EuiText>
        ),
      },
      {
        title: i18n.translate('xpack.securitySolution.endpoint.policyList.stepTwoTitle', {
          defaultMessage: 'We’ll create a recommended security policy for you.',
        }),
        children: (
          <EuiText color="subdued" size="xs">
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policyList.stepTwo"
              defaultMessage="You can edit this policy in the “Policies” tab after you’ve added the Elastic Endpoint integration."
            />
          </EuiText>
        ),
      },
      {
        title: i18n.translate('xpack.securitySolution.endpoint.policyList.stepThreeTitle', {
          defaultMessage: 'Enroll your agents through Fleet.',
        }),
        children: (
          <EuiText color="subdued" size="xs">
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policyList.stepThree"
              defaultMessage="If you haven’t already, enroll your agents through Fleet using the same agent configuration."
            />
          </EuiText>
        ),
      },
    ],
    []
  );

  return (
    <ManagementEmptyState
      loading={loading}
      onActionClick={onActionClick}
      actionDisabled={actionDisabled}
      dataTestSubj="emptyPolicyTable"
      steps={policySteps}
      headerComponent={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policyList.noPolicyPrompt"
          defaultMessage="Looks like you're not using the Elastic Endpoint"
        />
      }
      bodyComponent={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policyList.noPolicyInstructions"
          defaultMessage="Elastic Endpoint Security gives you the power to keep your endpoints safe from attack, as well as unparalleled visibility into any threat in your environment."
        />
      }
    />
  );
});

const HostsEmptyState = React.memo<{
  loading: boolean;
  onActionClick: (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  actionDisabled: boolean;
  handleSelectableOnChange: (o: EuiSelectableProps['options']) => void;
  selectionOptions: EuiSelectableProps['options'];
}>(({ loading, onActionClick, actionDisabled, handleSelectableOnChange, selectionOptions }) => {
  const policySteps = useMemo(
    () => [
      {
        title: i18n.translate('xpack.securitySolution.endpoint.hostList.stepOneTitle', {
          defaultMessage: 'Select a policy you created from the list below.',
        }),
        children: (
          <>
            <EuiText color="subdued" size="xs">
              <FormattedMessage
                id="xpack.securitySolution.endpoint.hostList.stepOne"
                defaultMessage="These are existing policies."
              />
            </EuiText>
            <EuiSpacer size="m" />
            <EuiSelectable
              options={selectionOptions}
              singleSelection="always"
              isLoading={loading}
              height={100}
              listProps={{ bordered: true, singleSelection: true }}
              onChange={handleSelectableOnChange}
              data-test-subj="onboardingPolicySelect"
            >
              {(list) => {
                return loading ? (
                  <EuiSelectableMessage>
                    <FormattedMessage
                      id="xpack.securitySolution.endpoint.hostList.loadingPolicies"
                      defaultMessage="Loading policy configs"
                    />
                  </EuiSelectableMessage>
                ) : selectionOptions.length ? (
                  list
                ) : (
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.hostList.noPolicies"
                    defaultMessage="There are no policies."
                  />
                );
              }}
            </EuiSelectable>
          </>
        ),
      },
      {
        title: i18n.translate('xpack.securitySolution.endpoint.hostList.stepTwoTitle', {
          defaultMessage:
            'Head over to Ingest to deploy your Agent with Endpoint Security enabled.',
        }),
        children: (
          <EuiText color="subdued" size="xs">
            <FormattedMessage
              id="xpack.securitySolution.endpoint.hostList.stepTwo"
              defaultMessage="You'll be given a command in Ingest to get you started."
            />
          </EuiText>
        ),
      },
    ],
    [selectionOptions, handleSelectableOnChange, loading]
  );

  return (
    <ManagementEmptyState
      loading={loading}
      onActionClick={onActionClick}
      actionDisabled={actionDisabled}
      dataTestSubj="emptyHostsTable"
      steps={policySteps}
      headerComponent={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.hostList.noHostsPrompt"
          defaultMessage="You have a policy, but no hosts are deployed!"
        />
      }
      bodyComponent={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.hostList.noHostsInstructions"
          defaultMessage="Elastic Endpoint Security gives you the power to keep your hosts safe from attack, as well as unparalleled visibility into any threat in your environment."
        />
      }
    />
  );
});

const ManagementEmptyState = React.memo<{
  loading: boolean;
  onActionClick?: (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  actionDisabled?: boolean;
  actionButton?: JSX.Element;
  dataTestSubj: string;
  steps?: ManagementStep[];
  headerComponent: JSX.Element;
  bodyComponent: JSX.Element;
}>(
  ({
    loading,
    onActionClick,
    actionDisabled,
    dataTestSubj,
    steps,
    actionButton,
    headerComponent,
    bodyComponent,
  }) => {
    return (
      <div data-test-subj={dataTestSubj}>
        {loading ? (
          <EuiFlexGroup alignItems="center" justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" className="essentialAnimation" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <>
            <EuiSpacer size="xxl" />
            <EuiTitle size="m">
              <h2 style={TEXT_ALIGN_CENTER}>{headerComponent}</h2>
            </EuiTitle>
            <EuiSpacer size="xxl" />
            <EuiText textAlign="center" color="subdued" size="s">
              {bodyComponent}
            </EuiText>
            <EuiSpacer size="xxl" />
            {steps && (
              <EuiFlexGroup alignItems="center" justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiSteps steps={steps} data-test-subj={'onboardingSteps'} />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
            <EuiFlexGroup alignItems="center" justifyContent="center">
              <EuiFlexItem grow={false}>
                <>
                  {actionButton ? (
                    actionButton
                  ) : (
                    <EuiButton
                      fill
                      onClick={onActionClick}
                      isDisabled={actionDisabled}
                      data-test-subj="onboardingStartButton"
                    >
                      <FormattedMessage
                        id="xpack.securitySolution.endpoint.policyList.emptyCreateNewButton"
                        defaultMessage="Click here to get started"
                      />
                    </EuiButton>
                  )}
                </>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </div>
    );
  }
);

PolicyEmptyState.displayName = 'PolicyEmptyState';
HostsEmptyState.displayName = 'HostsEmptyState';
ManagementEmptyState.displayName = 'ManagementEmptyState';

export { PolicyEmptyState, HostsEmptyState, ManagementEmptyState };
