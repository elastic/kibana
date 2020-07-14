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
  EuiIcon,
  EuiLoadingSpinner,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import onboardingLogo from '../images/security_administration_onboarding.svg';

const TEXT_ALIGN_CENTER: CSSProperties = Object.freeze({
  textAlign: 'center',
});

const MAX_SIZE_ONBOARDING_LOGO: CSSProperties = Object.freeze({
  maxWidth: 550,
  maxHeight: 420,
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
  return (
    <div data-test-subj="emptyPolicyTable">
      {loading ? (
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" className="essentialAnimation" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiFlexGroup data-test-subj="policyOnboardingInstructions" alignItems="center">
          <EuiFlexItem>
            <EuiText>
              <h3>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policyList.onboardingTitle"
                  defaultMessage="Get started with Elastic Endpoint Security"
                />
              </h3>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policyList.onboardingSectionOne"
                defaultMessage="Elastic Endpoint Security protects your hosts with threat prevention, detection, and deep security data visibility."
              />
            </EuiText>
            <EuiSpacer size="m" />
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policyList.onboardingSectionTwo"
                defaultMessage="From this page, you’ll be able to view and manage the hosts in your environment running Elastic Endpoint Security."
              />
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup alignItems="center" style={{ maxWidth: '90%' }}>
              <EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false} style={{ marginRight: '10px' }}>
                    <EuiIcon type="grid" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false} style={{ marginLeft: '0' }}>
                    <EuiText>
                      <h4>
                        <FormattedMessage
                          id="xpack.securitySolution.endpoint.policyList.onboardingHostTitle"
                          defaultMessage="Hosts"
                        />
                      </h4>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.policyList.onboardingHostInfo"
                    defaultMessage="Hosts running Elastic Endpoint Security"
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false} style={{ marginRight: '10px' }}>
                    <EuiIcon type="controlsHorizontal" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false} style={{ marginLeft: '0' }}>
                    <EuiText>
                      <h4>
                        <FormattedMessage
                          id="xpack.securitySolution.endpoint.policyList.onboardingPolicyTitle"
                          defaultMessage="Policies"
                        />
                      </h4>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.policyList.onboardingPolicyInfo"
                    defaultMessage="View and configure protections"
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policyList.onboardingSectionThree"
                defaultMessage="To get started, add the Elastic Endpoint Security integration to your Agents. For more information, "
              />
              <EuiLink external href="https://www.elastic.co/guide/en/security/current/index.html">
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policyList.onboardingDocsLink"
                  defaultMessage="view the Security app documentation"
                />
              </EuiLink>
            </EuiText>
            <EuiSpacer size="l" />
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  iconType="plusInCircle"
                  onClick={onActionClick}
                  isDisabled={actionDisabled}
                  data-test-subj="onboardingStartButton"
                >
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.policyList.actionButtonText"
                    defaultMessage="Add Endpoint Security"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiIcon type={onboardingLogo} size="original" style={MAX_SIZE_ONBOARDING_LOGO} />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </div>
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
          defaultMessage: 'Select the policy you want to use to protect your hosts',
        }),
        children: (
          <>
            <EuiText color="subdued" size="m" grow={false}>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.hostList.stepOne"
                defaultMessage="Existing policies are listed below. This can be changed later."
              />
            </EuiText>
            <EuiSpacer size="xxl" />
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
            'Enroll your agents enabled with Endpoint Security through Ingest Manager',
        }),
        status: actionDisabled ? 'disabled' : '',
        children: (
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiText color="subdued" size="m" grow={false}>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.hostList.stepTwo"
                  defaultMessage="You’ll be provided with the necessary commands to get started."
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={onActionClick}
                isDisabled={actionDisabled}
                data-test-subj="onboardingStartButton"
              >
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policyList.emptyCreateNewButton"
                  defaultMessage="Enroll Agent"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
    ],
    [selectionOptions, handleSelectableOnChange, loading, actionDisabled, onActionClick]
  );

  return (
    <ManagementEmptyState
      loading={loading}
      dataTestSubj="emptyHostsTable"
      steps={policySteps}
      headerComponent={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.hostList.noEndpointsPrompt"
          defaultMessage="Enable Elastic Endpoint Security on your agents"
        />
      }
      bodyComponent={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.hostList.noEndpointsInstructions"
          defaultMessage="You’ve created your security policy. Now you need to enable the Elastic Endpoint Security capabilities on your agents following the steps below."
        />
      }
    />
  );
});

const ManagementEmptyState = React.memo<{
  loading: boolean;
  dataTestSubj: string;
  steps?: ManagementStep[];
  headerComponent: JSX.Element;
  bodyComponent: JSX.Element;
}>(({ loading, dataTestSubj, steps, headerComponent, bodyComponent }) => {
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
          <EuiText textAlign="center" color="subdued" size="m">
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
        </>
      )}
    </div>
  );
});

PolicyEmptyState.displayName = 'PolicyEmptyState';
HostsEmptyState.displayName = 'HostsEmptyState';
ManagementEmptyState.displayName = 'ManagementEmptyState';

export { PolicyEmptyState, HostsEmptyState };
