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
import { isEmpty, without } from 'lodash/fp';
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
  getAssignableArtifactsList,
  getAssignableArtifactsListIsLoading,
  getUpdateArtifactsIsLoading,
  getUpdateArtifactsLoaded,
  getAssignableArtifactsListExist,
  getAssignableArtifactsListExistIsLoading,
} from '../../../store/policy_details/selectors';
import {
  usePolicyDetailsNavigateCallback,
  usePolicyDetailsSelector,
  usePolicyTrustedAppsNotification,
} from '../../policy_hooks';
import { PolicyArtifactsAssignableList } from '../../artifacts/assignable';
import { SearchExceptions } from '../../../../../components/search_exceptions';

export const PolicyTrustedAppsFlyout = React.memo(() => {
  usePolicyTrustedAppsNotification();
  const dispatch = useDispatch();
  const [selectedArtifactIds, setSelectedArtifactIds] = useState<string[]>([]);
  const location = usePolicyDetailsSelector(getCurrentArtifactsLocation);
  const policyItem = usePolicyDetailsSelector(policyDetails);
  const assignableArtifactsList = usePolicyDetailsSelector(getAssignableArtifactsList);
  const isAssignableArtifactsListLoading = usePolicyDetailsSelector(
    getAssignableArtifactsListIsLoading
  );
  const isUpdateArtifactsLoading = usePolicyDetailsSelector(getUpdateArtifactsIsLoading);
  const isUpdateArtifactsLoaded = usePolicyDetailsSelector(getUpdateArtifactsLoaded);
  const isAssignableArtifactsListExist = usePolicyDetailsSelector(getAssignableArtifactsListExist);
  const isAssignableArtifactsListExistLoading = usePolicyDetailsSelector(
    getAssignableArtifactsListExistIsLoading
  );

  const navigateCallback = usePolicyDetailsNavigateCallback();

  const policyName = policyItem?.name ?? '';

  const handleListFlyoutClose = useCallback(
    () =>
      navigateCallback({
        show: undefined,
      }),
    [navigateCallback]
  );

  useEffect(() => {
    if (isUpdateArtifactsLoaded) {
      handleListFlyoutClose();
      dispatch({
        type: 'policyArtifactsUpdateTrustedAppsChanged',
        payload: { type: 'UninitialisedResourceState' },
      });
    }
  }, [dispatch, handleListFlyoutClose, isUpdateArtifactsLoaded]);

  const handleOnConfirmAction = useCallback(() => {
    dispatch({
      type: 'policyArtifactsUpdateTrustedApps',
      payload: { trustedAppIds: selectedArtifactIds },
    });
  }, [dispatch, selectedArtifactIds]);

  const handleOnSearch = useCallback(
    (filter) => {
      dispatch({
        type: 'policyArtifactsAssignableListPageDataFilter',
        payload: { filter },
      });
    },
    [dispatch]
  );

  const searchWarningMessage = useMemo(
    () => (
      <>
        <EuiCallOut
          data-test-subj="tooMuchResultsWarningMessageTrustedAppsFlyout"
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

  const canShowPolicyArtifactsAssignableList = useMemo(
    () =>
      isAssignableArtifactsListExistLoading ||
      isAssignableArtifactsListLoading ||
      !isEmpty(assignableArtifactsList?.data),
    [
      assignableArtifactsList?.data,
      isAssignableArtifactsListExistLoading,
      isAssignableArtifactsListLoading,
    ]
  );

  const entriesExists = useMemo(
    () => isEmpty(assignableArtifactsList?.data) && isAssignableArtifactsListExist,
    [assignableArtifactsList?.data, isAssignableArtifactsListExist]
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
        {(assignableArtifactsList?.total || 0) > 100 ? searchWarningMessage : null}
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

        {canShowPolicyArtifactsAssignableList ? (
          <PolicyArtifactsAssignableList
            data-test-subj="artifactsListTrustedAppsFlyout"
            artifacts={assignableArtifactsList}
            selectedArtifactIds={selectedArtifactIds}
            isListLoading={
              isAssignableArtifactsListLoading || isAssignableArtifactsListExistLoading
            }
            selectedArtifactsUpdated={(artifactId, selected) => {
              setSelectedArtifactIds((currentSelectedArtifactIds) =>
                selected
                  ? [...currentSelectedArtifactIds, artifactId]
                  : without([artifactId], currentSelectedArtifactIds)
              );
            }}
          />
        ) : entriesExists ? (
          <EuiEmptyPrompt
            data-test-subj="noItemsFoundTrustedAppsFlyout"
            title={
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.noResults"
                defaultMessage="No items found"
              />
            }
          />
        ) : (
          <EuiEmptyPrompt
            data-test-subj="noAssignableItemsTrustedAppsFlyout"
            title={
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.noAssignable"
                defaultMessage="There are no assignable Trused Apps to assign to this policy"
              />
            }
          />
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
              className="eui-textTruncate"
              style={{ maxWidth: '300px' }}
              data-test-subj="confirmPolicyTrustedAppsFlyout"
              fill
              onClick={handleOnConfirmAction}
              isLoading={isUpdateArtifactsLoading}
              disabled={isEmpty(selectedArtifactIds)}
              title={policyName}
            >
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.confirm"
                defaultMessage="Assing to {policyName}"
                values={{
                  policyName,
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
