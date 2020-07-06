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
  return (
    <div data-test-subj="emptyPolicyTable">
      {loading ? (
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" className="essentialAnimation" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiFlexGroup data-test-subj="policyOnboardingInstructions">
          <EuiFlexItem>
            <EuiText>
              <h3>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policyList.onboardingTitle"
                  defaultMessage="Get started with Elastic Endpoint Security"
                />
              </h3>
            </EuiText>
            <EuiSpacer size="xl" />
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policyList.onboardingSectionOne"
                defaultMessage="Elastic Endpoint Security gives you the power to keep your endpoints safe from attack, as well as unparalleled visibility into any threat in your environment."
              />
            </EuiText>
            <EuiSpacer size="xl" />
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policyList.onboardingSectionTwo"
                defaultMessage="You’ll be able to view and manage hosts in your environment running the Elastic Endpoint from this page."
              />
            </EuiText>
            <EuiSpacer size="xl" />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false} style={{ marginRight: '10px' }}>
                    <EuiIcon type="search" />
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
                    defaultMessage="Hosts running the Elastic Endpoint"
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false} style={{ marginRight: '10px' }}>
                    <EuiIcon type="tableDensityExpanded" />
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
            <EuiSpacer size="xl" />
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policyList.onboardingSectionThree"
                defaultMessage="To get started, you’ll have to add the Elastic Endpoint integration to your Agents. Let’s do that now!"
              />
            </EuiText>
            <EuiSpacer size="xl" />
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
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policyList.placeholdForPictures"
              defaultMessage="Pictures!!!"
            />
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
        title: i18n.translate('xpack.securitySolution.endpoint.endpointList.stepOneTitle', {
          defaultMessage: 'Select a policy you created from the list below',
        }),
        children: (
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
                    id="xpack.securitySolution.endpoint.endpointList.loadingPolicies"
                    defaultMessage="Loading policy configs"
                  />
                </EuiSelectableMessage>
              ) : selectionOptions.length ? (
                list
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.endpointList.noPolicies"
                  defaultMessage="There are no policies."
                />
              );
            }}
          </EuiSelectable>
        ),
      },
      {
        title: i18n.translate('xpack.securitySolution.endpoint.endpointList.stepTwoTitle', {
          defaultMessage: 'Head over to Ingest to deploy your Agent with Endpoint Security enabled',
        }),
        status: actionDisabled ? 'disabled' : '',
        children: (
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiText color="subdued" size="m" grow={false}>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.endpointList.stepTwo"
                  defaultMessage="You'll be given a command in Ingest to get you started"
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
      dataTestSubj="emptyEndpointsTable"
      steps={policySteps}
      headerComponent={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.endpointList.noEndpointsPrompt"
          defaultMessage="You have a policy, but no Agents with Endpoint Security are deployed"
        />
      }
      bodyComponent={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.endpointList.noEndpointsInstructions"
          defaultMessage="Elastic Endpoint Security gives you the power to keep your endpoints safe from attack, as well as unparalleled visibility into any threat in your environment."
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
EndpointsEmptyState.displayName = 'EndpointsEmptyState';
ManagementEmptyState.displayName = 'ManagementEmptyState';

export { PolicyEmptyState, EndpointsEmptyState };
