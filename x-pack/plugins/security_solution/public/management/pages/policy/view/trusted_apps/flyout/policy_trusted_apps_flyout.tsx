/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash/fp';
import {
  EuiButton,
  EuiTitle,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiSpacer,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
} from '@elastic/eui';
import {
  policyDetails,
  getCurrentArtifactsLocation,
  getAvailableArtifactsList,
  getAvailableArtifactsListIsLoading,
  getUpdateArtifactsIsLoading,
  getUpdateArtifactsLoaded,
  getAvailableArtifactsListExist,
  getAvailableArtifactsListExistIsLoading,
} from '../../../store/policy_details/selectors';
import {
  usePolicyDetailsNavigateCallback,
  usePolicyDetailsSelector,
  usePolicyTrustedAppsNotification,
} from '../../policy_hooks';
import { PolicyArtifactsList } from '../../artifacts/list';
import { SearchExceptions } from '../../../../../components/search_exceptions';

export const PolicyTrustedAppsFlyout = React.memo(() => {
  usePolicyTrustedAppsNotification();
  const dispatch = useDispatch();
  const [selectedArtifactIds, setSelectedArtifactIds] = useState<string[]>([]);
  const location = usePolicyDetailsSelector(getCurrentArtifactsLocation);
  const policyItem = usePolicyDetailsSelector(policyDetails);
  const availableArtifactsList = usePolicyDetailsSelector(getAvailableArtifactsList);
  const isAvailableArtifactsListLoading = usePolicyDetailsSelector(
    getAvailableArtifactsListIsLoading
  );
  const isUpdateArtifactsLoading = usePolicyDetailsSelector(getUpdateArtifactsIsLoading);
  const isUpdateArtifactsLoaded = usePolicyDetailsSelector(getUpdateArtifactsLoaded);
  const isAvailableArtifactsListExist = usePolicyDetailsSelector(getAvailableArtifactsListExist);
  const isAvailableArtifactsListExistLoading = usePolicyDetailsSelector(
    getAvailableArtifactsListExistIsLoading
  );

  const policyName = policyItem?.name ?? '';

  const handleListFlyoutClose = usePolicyDetailsNavigateCallback(() => ({
    show: undefined,
  }));

  useEffect(() => {
    if (isUpdateArtifactsLoaded) {
      handleListFlyoutClose();
      dispatch({
        type: 'policyArtifactsUpdateTrustedAppsChanged',
        payload: { type: 'UninitialisedResourceState' },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUpdateArtifactsLoaded]);

  const handleOnConfirmAction = useCallback(() => {
    dispatch({
      type: 'policyArtifactsUpdateTrustedApps',
      payload: { trustedAppIds: selectedArtifactIds },
    });
  }, [dispatch, selectedArtifactIds]);
  const handleOnSearch = useCallback(
    (filter) => {
      dispatch({
        type: 'policyArtifactsAvailableListPageDataFilter',
        payload: { filter },
      });
    },
    [dispatch]
  );

  const searchWarningMessage = useMemo(
    () => (
      <>
        <EuiCallOut
          color="warning"
          size="s"
          heading="h4"
          title={i18n.translate(
            'xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.searchWarning.title',
            {
              defaultMessage: 'Limited search results',
            }
          )}
        >
          {i18n.translate(
            'xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.searchWarning.text',
            {
              defaultMessage:
                'Only the first 100 trusted applications are displayed. Please use the search bar to refine the results.',
            }
          )}
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    ),
    []
  );

  const canShowPolicyArtifactsList = useMemo(
    () =>
      isAvailableArtifactsListExistLoading ||
      isAvailableArtifactsListLoading ||
      !isEmpty(availableArtifactsList?.items),
    [
      availableArtifactsList?.items,
      isAvailableArtifactsListExistLoading,
      isAvailableArtifactsListLoading,
    ]
  );

  const entriesExists = useMemo(
    () => isEmpty(availableArtifactsList?.items) && isAvailableArtifactsListExist,
    [availableArtifactsList?.items, isAvailableArtifactsListExist]
  );

  return (
    <EuiFlyout onClose={handleListFlyoutClose}>
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
        {(availableArtifactsList?.totalItemsCount || 0) > 2 ? searchWarningMessage : null}
        <SearchExceptions
          defaultValue={location.filter}
          onSearch={handleOnSearch}
          placeholder={i18n.translate(
            'xpack.securitySolution.endpoint.policy.trustedApps.layout.searh.label',
            {
              defaultMessage: 'Search trusted applications',
            }
          )}
        />
        <EuiSpacer size="m" />

        {canShowPolicyArtifactsList ? (
          <PolicyArtifactsList
            artifacts={availableArtifactsList}
            defaultSelectedArtifactIds={[]}
            isListLoading={isAvailableArtifactsListLoading || isAvailableArtifactsListExistLoading}
            selectedArtifactsUpdated={(artifactIds) => setSelectedArtifactIds(artifactIds)}
          />
        ) : entriesExists ? (
          <EuiEmptyPrompt
            title={
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.noResults"
                defaultMessage="No items found"
              />
            }
          />
        ) : (
          'There are no available trusted apps' // TODO: to be done
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="cancelPolicyTrustedAppsFlyout"
              onClick={handleListFlyoutClose}
            >
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.cancel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="confirmPolicyTrustedAppsFlyout"
              fill
              onClick={handleOnConfirmAction}
              isLoading={isUpdateArtifactsLoading}
              disabled={isEmpty(selectedArtifactIds)}
            >
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.confirm"
                defaultMessage="Assing to {policyName}"
                values={{
                  policyName: `${policyName.substring(0, 20)}${
                    policyName.length > 20 ? '...' : ''
                  }`,
                }}
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
});

PolicyTrustedAppsFlyout.displayName = 'PolicyTrustedAppsFlyout';
