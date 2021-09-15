/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiTitle,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageContent,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiSpacer,
} from '@elastic/eui';
import { AppAction } from '../../../../../../common/store/actions';
import { isAddTrustedAppsFlyoutOpen, policyDetails } from '../../../store/policy_details/selectors';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { PolicyArtifactsList } from '../../artifacts/list';

export const PolicyTrustedAppsLayout = React.memo(() => {
  const dispatch = useDispatch<Dispatch<AppAction>>();
  const isAddTrustedAppsFlyoutOpenFlag = usePolicyDetailsSelector(isAddTrustedAppsFlyoutOpen);
  const policyItem = usePolicyDetailsSelector(policyDetails);

  const policyName = policyItem?.name ?? '';

  const onClickAssignTrustedAppButton = useCallback(() => {
    dispatch({
      type: 'toggleAddTrustedAppsFlyout',
      payload: { addTrustedAppsFlyoutOpen: !isAddTrustedAppsFlyoutOpenFlag },
    });
  }, [dispatch, isAddTrustedAppsFlyoutOpenFlag]);
  const assignTrustedAppButton = useMemo(
    () => (
      <EuiButton fill iconType="plusInCircle" onClick={onClickAssignTrustedAppButton}>
        {i18n.translate(
          'xpack.securitySolution.endpoint.policy.trustedApps.layout.assignToPolicy',
          {
            defaultMessage: 'Assign trusted applications to policy',
          }
        )}
      </EuiButton>
    ),
    [onClickAssignTrustedAppButton]
  );

  return (
    <div>
      <EuiPageHeader alignItems="center">
        <EuiPageHeaderSection>
          <EuiTitle size="m">
            <h2>
              {i18n.translate('xpack.securitySolution.endpoint.policy.trustedApps.layout.title', {
                defaultMessage: 'Assigned trusted applications',
              })}
            </h2>
          </EuiTitle>
        </EuiPageHeaderSection>
        <EuiPageHeaderSection>{assignTrustedAppButton}</EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
        color="transparent"
        borderRadius="none"
      >
        {/* TODO: To be implemented */}
        {'Policy trusted apps layout content'}
      </EuiPageContent>
      {isAddTrustedAppsFlyoutOpenFlag ? (
        <EuiFlyout
          onClose={() =>
            dispatch({
              type: 'toggleAddTrustedAppsFlyout',
              payload: { addTrustedAppsFlyoutOpen: !isAddTrustedAppsFlyoutOpenFlag },
            })
          }
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.title"
                  defaultMessage="Assign trusted applications"
                />
              </h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.subtitle"
              defaultMessage="Select trusted applications to add to {policyName}"
              values={{ policyName }}
            />
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <PolicyArtifactsList />
          </EuiFlyoutBody>
        </EuiFlyout>
      ) : null}
    </div>
  );
});

PolicyTrustedAppsLayout.displayName = 'PolicyTrustedAppsLayout';
