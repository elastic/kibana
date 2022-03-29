/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { FormattedMessage } from '@kbn/i18n-react';
import onboardingLogo from '../images/security_administration_onboarding.svg';
import { useKibana } from '../../common/lib/kibana';

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
  policyEntryPoint?: boolean;
}>(({ loading, onActionClick, actionDisabled, policyEntryPoint = false }) => {
  const docLinks = useKibana().services.docLinks;
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
                  defaultMessage="Get started with Endpoint Security"
                />
              </h3>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policyList.onboardingSectionOne"
                defaultMessage="Protect your hosts with threat prevention, detection, and deep security data visibility."
              />
            </EuiText>
            <EuiSpacer size="m" />
            <EuiText size="s" color="subdued">
              {policyEntryPoint ? (
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policyList.onboardingSectionTwo.fromPolicyPage"
                  defaultMessage="From this page, you’ll be able to view and manage the Endpoint Security Integration policies in your environment running Endpoint Security."
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policyList.onboardingSectionTwo.fromEndpointPage"
                  defaultMessage="From this page, you’ll be able to view and manage the hosts in your environment running Endpoint Security."
                />
              )}
            </EuiText>
            <EuiSpacer size="m" />
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policyList.onboardingSectionThree"
                defaultMessage="To get started, add the Endpoint Security integration to your Agents. For more information, "
              />
              <EuiLink external href={`${docLinks.links.siem.guide}`}>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policyList.onboardingDocsLink"
                  defaultMessage="view the Elastic Security documentation"
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

const EndpointsEmptyState = React.memo<{
  loading: boolean;
  onActionClick: (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  actionDisabled: boolean;
  handleSelectableOnChange: (o: EuiSelectableProps['options']) => void;
  selectionOptions: EuiSelectableProps['options'];
}>(({ loading, onActionClick, actionDisabled, handleSelectableOnChange, selectionOptions }) => {
  const policySteps = useMemo(
    () => [
      {
        title: i18n.translate('xpack.securitySolution.endpoint.list.stepOneTitle', {
          defaultMessage: 'Select the integration you want to use',
        }),
        children: (
          <>
            <EuiText color="subdued" size="m" grow={false}>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.list.stepOne"
                defaultMessage="Select from existing integrations. This can be changed later."
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
                      id="xpack.securitySolution.endpoint.list.loadingPolicies"
                      defaultMessage="Loading integrations"
                    />
                  </EuiSelectableMessage>
                ) : selectionOptions.length ? (
                  list
                ) : (
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.list.noPolicies"
                    defaultMessage="There are no integrations."
                  />
                );
              }}
            </EuiSelectable>
          </>
        ),
      },
      {
        title: i18n.translate('xpack.securitySolution.endpoint.list.stepTwoTitle', {
          defaultMessage: 'Enroll your agents enabled with Endpoint Security through Fleet',
        }),
        status: actionDisabled ? 'disabled' : '',
        children: (
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiText color="subdued" size="m" grow={false}>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.list.stepTwo"
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
          id="xpack.securitySolution.endpoint.list.noEndpointsPrompt"
          defaultMessage="Next step: Enroll an Agent with Endpoint Security"
        />
      }
      bodyComponent={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.list.noEndpointsInstructions"
          defaultMessage="You’ve added the Endpoint Security integration. Now enroll your agents using the steps below."
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
EndpointsEmptyState.displayName = 'HostsEmptyState';
ManagementEmptyState.displayName = 'ManagementEmptyState';

export { PolicyEmptyState, EndpointsEmptyState as HostsEmptyState };
