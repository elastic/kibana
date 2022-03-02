/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  ENDPOINT_TRUSTED_APPS_LIST_ID,
  ENDPOINT_EVENT_FILTERS_LIST_ID,
} from '@kbn/securitysolution-list-constants';
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
import { useAppUrl, useHttp } from '../../../../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../../../../common/constants';
import { ImmutableObject, PolicyData } from '../../../../../../../common/endpoint/types';
import { ManagementPageLoader } from '../../../../../components/management_page_loader';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import {
  getEventFiltersListPath,
  getHostIsolationExceptionsListPath,
  getTrustedAppsListPath,
} from '../../../../../common/routing';
import {
  usePolicyDetailsSelector,
  usePolicyDetailsArtifactsNavigateCallback,
} from '../../policy_hooks';
import { getCurrentArtifactsLocation } from '../../../store/policy_details/selectors';
import { ExceptionsListApiClient } from '../../../../../services/exceptions_list/exceptions_list_api_client';
import { SEARCHABLE_FIELDS as TRUSTED_APPS_SEARCHABLE_FIELDS } from '../../../../trusted_apps/constants';
import { SEARCHABLE_FIELDS as EVENT_FILTERS_SEARCHABLE_FIELDS } from '../../../../event_filters/constants';
import { SEARCHABLE_FIELDS as HOST_ISOLATION_EXCEPTIONS_SEARCHABLE_FIELDS } from '../../../../host_isolation_exceptions/constants';
import { useListArtifact } from '../../../../../hooks/artifacts';
import { TrustedAppsApiClient } from '../../../../trusted_apps/service/trusted_apps_api_client';
import { EventFiltersApiClient } from '../../../../event_filters/service/event_filters_api_client';
import { HostIsolationExceptionsApiClient } from '../../../../host_isolation_exceptions/host_isolation_exceptions_api_client';
import { PolicyArtifactsEmptyUnassigned, PolicyArtifactsEmptyUnexisting } from '../empty';
import { PolicyArtifactsList } from '../list';
import { PolicyArtifactsFlyout } from '../flyout';
import { PolicyArtifactsPageLabels, policyArtifactsPageLabels } from '../translations';
import { PolicyArtifactsDeleteModal } from '../delete_modal';

interface PolicyArtifactsLayoutProps {
  policyItem?: ImmutableObject<PolicyData> | undefined;
  listId: string;
  /** A list of labels for the given policy artifact page. Not all have to be defined, only those that should override the defaults */
  labels: PolicyArtifactsPageLabels;
}
export const PolicyArtifactsLayout = React.memo<PolicyArtifactsLayoutProps>(
  ({ policyItem, listId, labels: _labels = {} }) => {
    const http = useHttp();
    const { getAppUrl } = useAppUrl();
    const navigateCallback = usePolicyDetailsArtifactsNavigateCallback(listId);
    const { canCreateArtifactsByPolicy } = useUserPrivileges().endpointPrivileges;
    const urlParams = usePolicyDetailsSelector(getCurrentArtifactsLocation);
    const [exceptionItemToDelete, setExceptionItemToDelete] = useState<
      ExceptionListItemSchema | undefined
    >();

    const labels = useMemo<typeof policyArtifactsPageLabels>(() => {
      return {
        ...policyArtifactsPageLabels,
        ..._labels,
      };
    }, [_labels]);

    const [exceptionsListApiClient, searcheableFields, getArtifactPath] = useMemo((): [
      ExceptionsListApiClient,
      Readonly<string[]>,
      () => string
    ] => {
      if (listId === ENDPOINT_TRUSTED_APPS_LIST_ID) {
        return [
          TrustedAppsApiClient.getInstance(http),
          TRUSTED_APPS_SEARCHABLE_FIELDS,
          getTrustedAppsListPath,
        ];
      } else if (listId === ENDPOINT_EVENT_FILTERS_LIST_ID) {
        return [
          EventFiltersApiClient.getInstance(http),
          EVENT_FILTERS_SEARCHABLE_FIELDS,
          getEventFiltersListPath,
        ];
      } else {
        return [
          HostIsolationExceptionsApiClient.getInstance(http),
          HOST_ISOLATION_EXCEPTIONS_SEARCHABLE_FIELDS,
          getHostIsolationExceptionsListPath,
        ];
      }
    }, [http, listId]);

    const { data: allAssigned, isLoading: isLoadingAllAssigned } = useListArtifact(
      exceptionsListApiClient,
      [...searcheableFields],
      {
        policies: policyItem ? [policyItem.id, 'global'] : [],
      }
    );

    const {
      data: allArtifacts,
      isLoading: isLoadingAllArtifacts,
      isRefetching: isRefetchingAllArtifacts,
    } = useListArtifact(exceptionsListApiClient, [...searcheableFields], {}, {}, ['allExisting']);

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

      return (
        <>
          {labels.layoutAboutMessage(allAssigned?.total || 0)} {link}
        </>
      );
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
              searcheableFields={[...searcheableFields]}
              onClose={handleOnCloseFlyout}
              labels={labels}
            />
          )}
          {allArtifacts && allArtifacts.total !== 0 ? (
            <PolicyArtifactsEmptyUnassigned
              policyId={policyItem.id}
              policyName={policyItem.name}
              listId={listId}
              labels={labels}
            />
          ) : (
            <PolicyArtifactsEmptyUnexisting
              policyId={policyItem.id}
              policyName={policyItem.name}
              listId={listId}
              labels={labels}
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
            {canCreateArtifactsByPolicy && assignToPolicyButton}
          </EuiPageHeaderSection>
        </EuiPageHeader>
        {canCreateArtifactsByPolicy && urlParams.show === 'list' && (
          <PolicyArtifactsFlyout
            policyItem={policyItem}
            apiClient={exceptionsListApiClient}
            searcheableFields={[...searcheableFields]}
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
            onCancel={handleDeleteModalClose}
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
            searcheableFields={[...searcheableFields]}
            artifactPathFn={getArtifactPath}
            labels={labels}
            onDeleteActionCallback={handleOnDeleteActionCallback}
          />
        </EuiPageContent>
      </div>
    );
  }
);

PolicyArtifactsLayout.displayName = 'PolicyArtifactsLayout';
