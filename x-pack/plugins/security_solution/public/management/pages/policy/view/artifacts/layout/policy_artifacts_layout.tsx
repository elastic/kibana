/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  EuiTitle,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiText,
  EuiSpacer,
  EuiLink,
  EuiButton,
  EuiPageContent,
} from '@elastic/eui';
import { useAppUrl } from '../../../../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../../../../common/constants';
import { ImmutableObject, PolicyData } from '../../../../../../../common/endpoint/types';
import { ManagementPageLoader } from '../../../../../components/management_page_loader';
import { useUrlParams } from '../../../../../components/hooks/use_url_params';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import { usePolicyDetailsArtifactsNavigateCallback } from '../../policy_hooks';
import { ExceptionsListApiClient } from '../../../../../services/exceptions_list/exceptions_list_api_client';
import { useListArtifact } from '../../../../../hooks/artifacts';
import { PolicyArtifactsEmptyUnassigned, PolicyArtifactsEmptyUnexisting } from '../empty';
import { PolicyArtifactsList } from '../list';
import { PolicyArtifactsFlyout } from '../flyout';
import { PolicyArtifactsPageLabels, policyArtifactsPageLabels } from '../translations';
import { PolicyArtifactsDeleteModal } from '../delete_modal';
import { EventFiltersPageLocation } from '../../../../event_filters/types';
import { ArtifactListPageUrlParams } from '../../../../../components/artifact_list_page';

interface PolicyArtifactsLayoutProps {
  policyItem?: ImmutableObject<PolicyData> | undefined;
  /** A list of labels for the given policy artifact page. Not all have to be defined, only those that should override the defaults */
  labels: PolicyArtifactsPageLabels;
  getExceptionsListApiClient: () => ExceptionsListApiClient;
  searchableFields: readonly string[];
  getArtifactPath: (
    location?: Partial<EventFiltersPageLocation> | Partial<ArtifactListPageUrlParams>
  ) => string;
  getPolicyArtifactsPath: (policyId: string) => string;
  /** A boolean to check extra privileges for restricted actions, true when it's allowed, false when not */
  externalPrivileges?: boolean;
}
export const PolicyArtifactsLayout = React.memo<PolicyArtifactsLayoutProps>(
  ({
    policyItem,
    labels: _labels = {},
    getExceptionsListApiClient,
    searchableFields,
    getArtifactPath,
    getPolicyArtifactsPath,
    externalPrivileges = true,
  }) => {
    const exceptionsListApiClient = useMemo(
      () => getExceptionsListApiClient(),
      [getExceptionsListApiClient]
    );
    const { getAppUrl } = useAppUrl();
    const navigateCallback = usePolicyDetailsArtifactsNavigateCallback(
      exceptionsListApiClient.listId
    );
    const { canCreateArtifactsByPolicy } = useUserPrivileges().endpointPrivileges;
    const { urlParams } = useUrlParams();
    const [exceptionItemToDelete, setExceptionItemToDelete] = useState<
      ExceptionListItemSchema | undefined
    >();

    const labels = useMemo<typeof policyArtifactsPageLabels>(() => {
      return {
        ...policyArtifactsPageLabels,
        ..._labels,
      };
    }, [_labels]);

    const { data: allAssigned, isLoading: isLoadingAllAssigned } = useListArtifact(
      exceptionsListApiClient,
      {
        policies: policyItem ? [policyItem.id, 'all'] : [],
      },
      searchableFields
    );

    const {
      data: allArtifacts,
      isLoading: isLoadingAllArtifacts,
      isRefetching: isRefetchingAllArtifacts,
    } = useListArtifact(exceptionsListApiClient, {}, searchableFields, {}, ['allExisting']);

    const handleOnClickAssignButton = useCallback(() => {
      navigateCallback({ show: 'list' });
    }, [navigateCallback]);
    const handleOnCloseFlyout = useCallback(() => {
      navigateCallback({ show: undefined });
    }, [navigateCallback]);

    const handleDeleteModalClose = useCallback(() => {
      setExceptionItemToDelete(undefined);
    }, [setExceptionItemToDelete]);

    const handleOnDeleteActionCallback = useCallback(
      (item) => {
        setExceptionItemToDelete(item);
      },
      [setExceptionItemToDelete]
    );

    const assignToPolicyButton = useMemo(
      () => (
        <EuiButton
          fill
          iconType="plusInCircle"
          data-test-subj="artifacts-assign-button"
          onClick={handleOnClickAssignButton}
        >
          {labels.layoutAssignButtonTitle}
        </EuiButton>
      ),
      [handleOnClickAssignButton, labels.layoutAssignButtonTitle]
    );

    const aboutInfo = useMemo(() => {
      const link = (
        <EuiLink href={getAppUrl({ appId: APP_UI_ID, path: getArtifactPath() })} target="_blank">
          {labels.layoutViewAllLinkMessage}
        </EuiLink>
      );

      return labels.layoutAboutMessage(allAssigned?.total || 0, link);
    }, [getAppUrl, getArtifactPath, labels, allAssigned?.total]);

    const isGlobalLoading = useMemo(
      () => isLoadingAllAssigned || isLoadingAllArtifacts || isRefetchingAllArtifacts,
      [isLoadingAllAssigned, isLoadingAllArtifacts, isRefetchingAllArtifacts]
    );

    const isEmptyState = useMemo(() => allAssigned && allAssigned.total === 0, [allAssigned]);

    if (!policyItem || isGlobalLoading) {
      return <ManagementPageLoader data-test-subj="policy-artifacts-loading-spinner" />;
    }

    if (isEmptyState) {
      return (
        <>
          {canCreateArtifactsByPolicy && urlParams.show === 'list' && (
            <PolicyArtifactsFlyout
              policyItem={policyItem}
              apiClient={exceptionsListApiClient}
              searchableFields={[...searchableFields]}
              onClose={handleOnCloseFlyout}
              labels={labels}
            />
          )}
          {allArtifacts && allArtifacts.total !== 0 ? (
            <PolicyArtifactsEmptyUnassigned
              policyId={policyItem.id}
              policyName={policyItem.name}
              listId={exceptionsListApiClient.listId}
              labels={labels}
              getPolicyArtifactsPath={getPolicyArtifactsPath}
              getArtifactPath={getArtifactPath}
            />
          ) : (
            <PolicyArtifactsEmptyUnexisting
              policyId={policyItem.id}
              policyName={policyItem.name}
              labels={labels}
              getPolicyArtifactsPath={getPolicyArtifactsPath}
              getArtifactPath={getArtifactPath}
            />
          )}
        </>
      );
    }

    return (
      <div>
        <EuiPageHeader alignItems="center">
          <EuiPageHeaderSection data-test-subj="policy-artifacts-header-section">
            <EuiTitle size="m">
              <h2>{labels.layoutTitle}</h2>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiText size="xs" data-test-subj="policy-artifacts-layout-about">
              <p>{aboutInfo}</p>
            </EuiText>
          </EuiPageHeaderSection>
          <EuiPageHeaderSection>
            {canCreateArtifactsByPolicy && externalPrivileges && assignToPolicyButton}
          </EuiPageHeaderSection>
        </EuiPageHeader>
        {canCreateArtifactsByPolicy && externalPrivileges && urlParams.show === 'list' && (
          <PolicyArtifactsFlyout
            policyItem={policyItem}
            apiClient={exceptionsListApiClient}
            searchableFields={[...searchableFields]}
            onClose={handleOnCloseFlyout}
            labels={labels}
          />
        )}
        {exceptionItemToDelete && (
          <PolicyArtifactsDeleteModal
            policyId={policyItem.id}
            policyName={policyItem.name}
            apiClient={exceptionsListApiClient}
            exception={exceptionItemToDelete}
            onClose={handleDeleteModalClose}
            labels={labels}
          />
        )}
        <EuiSpacer size="l" />
        <EuiPageContent
          hasBorder={false}
          hasShadow={false}
          paddingSize="none"
          color="transparent"
          borderRadius="none"
        >
          <PolicyArtifactsList
            policy={policyItem}
            apiClient={exceptionsListApiClient}
            searchableFields={[...searchableFields]}
            labels={labels}
            onDeleteActionCallback={handleOnDeleteActionCallback}
            externalPrivileges={externalPrivileges}
            getPolicyArtifactsPath={getPolicyArtifactsPath}
            getArtifactPath={getArtifactPath}
          />
        </EuiPageContent>
      </div>
    );
  }
);

PolicyArtifactsLayout.displayName = 'PolicyArtifactsLayout';
