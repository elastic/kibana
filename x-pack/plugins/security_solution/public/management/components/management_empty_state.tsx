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
  EuiProgress,
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
  actionDisabled: boolean;
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
    />
  );
});

const ManagementEmptyState = React.memo<{
  loading: boolean;
  onActionClick?: (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  actionDisabled?: boolean;
  actionButton?: JSX.Element;
  dataTestSubj: string;
  steps: ManagementStep[];
}>(({ loading, onActionClick, actionDisabled, dataTestSubj, steps, actionButton }) => {
  return (
    <div data-test-subj={dataTestSubj}>
      {loading ? (
        <EuiProgress size="xs" color="accent" className="essentialAnimation" />
      ) : (
        <>
          <EuiSpacer size="xxl" />
          <EuiTitle size="m">
            <h2 style={TEXT_ALIGN_CENTER}>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policyList.noPoliciesPrompt"
                defaultMessage="Looks like you're not using Elastic Endpoint"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="xxl" />
          <EuiText textAlign="center" color="subdued" size="s">
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policyList.noPoliciesInstructions"
              defaultMessage="Elastic Endpoint Security gives you the power to keep your endpoints safe from attack, as well as unparalleled visibility into any threat in your environment."
            />
          </EuiText>
          <EuiSpacer size="xxl" />
          <EuiFlexGroup alignItems="center" justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiSteps steps={steps} data-test-subj={'onboardingSteps'} />
            </EuiFlexItem>
          </EuiFlexGroup>
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
});

PolicyEmptyState.displayName = 'PolicyEmptyState';
ManagementEmptyState.displayName = 'ManagementEmptyState';

export { PolicyEmptyState, ManagementEmptyState };
