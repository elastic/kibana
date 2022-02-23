/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import { EuiFlyoutSize } from '@elastic/eui/src/components/flyout/flyout';
import { useLocation } from 'react-router-dom';
import { AdministrationListPage } from '../administration_list_page';

import { PaginatedContent, PaginatedContentProps } from '../paginated_content';

import { ArtifactEntryCard } from '../artifact_entry_card';

import { ArtifactListPageLabels, artifactListPageLabels } from './translations';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';
import { ManagementPageLoader } from '../management_page_loader';
import { SearchExceptions } from '../search_exceptions';
import {
  useArtifactCardPropsProvider,
  UseArtifactCardPropsProviderProps,
} from './hooks/use_artifact_card_props_provider';
import { NoDataEmptyState } from './components/no_data_empty_state';
import { ArtifactFlyoutProps, MaybeArtifactFlyout } from './components/artifact_flyout';
import { useIsFlyoutOpened } from './hooks/use_is_flyout_opened';
import { useSetUrlParams } from './hooks/use_set_url_params';
import { useWithArtifactListData } from './hooks/use_with_artifact_list_data';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';
import { ArtifactListPageUrlParams } from './types';
import { useUrlParams } from './hooks/use_url_params';
import { ListPageRouteState, MaybeImmutable } from '../../../../common/endpoint/types';
import { DEFAULT_EXCEPTION_LIST_ITEM_SEARCHABLE_FIELDS } from '../../../../common/endpoint/service/artifacts/constants';
import { ArtifactDeleteModal } from './components/artifact_delete_modal';
import { useGetEndpointSpecificPolicies } from '../../services/policies/hooks';
import { getLoadPoliciesError } from '../../common/translations';
import { useToasts } from '../../../common/lib/kibana';
import { useMemoizedRouteState } from '../../common/hooks';
import { BackToExternalAppSecondaryButton } from '../back_to_external_app_secondary_button';
import { BackToExternalAppButton } from '../back_to_external_app_button';

type ArtifactEntryCardType = typeof ArtifactEntryCard;

type ArtifactListPagePaginatedContentComponent = PaginatedContentProps<
  ExceptionListItemSchema,
  ArtifactEntryCardType
>;

export interface ArtifactListPageProps {
  apiClient: ExceptionsListApiClient;
  /** The artifact Component that will be displayed in the Flyout for Create and Edit flows */
  ArtifactFormComponent: ArtifactFlyoutProps['FormComponent'];
  /** A list of labels for the given artifact page. Not all have to be defined, only those that should override the defaults */
  labels: ArtifactListPageLabels;
  /** A list of fields that will be used by the search functionality when a user enters a value in the searchbar */
  searchableFields?: MaybeImmutable<string[]>;
  flyoutSize?: EuiFlyoutSize;
  'data-test-subj'?: string;
}

export const ArtifactListPage = memo<ArtifactListPageProps>(
  ({
    apiClient,
    ArtifactFormComponent,
    searchableFields = DEFAULT_EXCEPTION_LIST_ITEM_SEARCHABLE_FIELDS,
    labels: _labels = {},
    'data-test-subj': dataTestSubj,
  }) => {
    const { state: routeState } = useLocation<ListPageRouteState | undefined>();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const toasts = useToasts();
    const isFlyoutOpened = useIsFlyoutOpened();
    const setUrlParams = useSetUrlParams();
    const {
      urlParams: { filter, includedPolicies },
    } = useUrlParams<ArtifactListPageUrlParams>();

    const {
      isPageInitializing,
      isFetching: isLoading,
      data: listDataResponse,
      uiPagination,
      doesDataExist,
      error,
      refetch: refetchListData,
    } = useWithArtifactListData(apiClient, searchableFields);

    const items = useMemo(() => {
      return listDataResponse?.data ?? [];
    }, [listDataResponse?.data]);

    const [selectedItemForDelete, setSelectedItemForDelete] = useState<
      undefined | ExceptionListItemSchema
    >(undefined);

    const [selectedItemForEdit, setSelectedItemForEdit] = useState<
      undefined | ExceptionListItemSchema
    >(undefined);

    const labels = useMemo<typeof artifactListPageLabels>(() => {
      return {
        ...artifactListPageLabels,
        ..._labels,
      };
    }, [_labels]);

    const handleOnCardActionClick = useCallback<UseArtifactCardPropsProviderProps['onAction']>(
      ({ type, item }) => {
        switch (type) {
          case 'edit':
            setSelectedItemForEdit(item);
            setUrlParams({ show: 'edit', itemId: item.item_id });
            break;

          case 'delete':
            setSelectedItemForDelete(item);
            break;
        }
      },
      [setUrlParams]
    );

    const handleCardProps = useArtifactCardPropsProvider({
      items,
      onAction: handleOnCardActionClick,
      cardActionDeleteLabel: labels.cardActionDeleteLabel,
      cardActionEditLabel: labels.cardActionEditLabel,
      dataTestSubj: getTestId('card'),
    });

    const policiesRequest = useGetEndpointSpecificPolicies({
      onError: (err) => {
        toasts.addWarning(getLoadPoliciesError(err));
      },
    });

    const memoizedRouteState = useMemoizedRouteState(routeState);

    const backButtonEmptyComponent = useMemo(() => {
      if (memoizedRouteState && memoizedRouteState.onBackButtonNavigateTo) {
        return <BackToExternalAppSecondaryButton {...memoizedRouteState} />;
      }
    }, [memoizedRouteState]);

    const backButtonHeaderComponent = useMemo(() => {
      if (memoizedRouteState && memoizedRouteState.onBackButtonNavigateTo) {
        return <BackToExternalAppButton {...memoizedRouteState} />;
      }
    }, [memoizedRouteState]);

    const handleOpenCreateFlyoutClick = useCallback(() => {
      setUrlParams({ show: 'create' });
    }, [setUrlParams]);

    const handlePaginationChange: ArtifactListPagePaginatedContentComponent['onChange'] =
      useCallback(
        ({ pageIndex, pageSize }) => {
          setUrlParams({
            page: pageIndex + 1,
            pageSize,
          });

          // Scroll to the top to ensure that when new set of data is received and list updated,
          // the user is back at the top of the list
          window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        },
        [setUrlParams]
      );

    const handleOnSearch = useCallback(
      (filterValue: string, selectedPolicies: string, doHardRefresh) => {
        setUrlParams({
          // `undefined` will drop the param from the url
          filter: filterValue.trim() === '' ? undefined : filterValue,
          includedPolicies: selectedPolicies.trim() === '' ? undefined : selectedPolicies,
        });

        if (doHardRefresh) {
          refetchListData();
        }
      },
      [refetchListData, setUrlParams]
    );

    const handleArtifactDeleteModalOnSuccess = useCallback(() => {
      setSelectedItemForDelete(undefined);
      refetchListData();
    }, [refetchListData]);

    const handleArtifactDeleteModalOnCancel = useCallback(() => {
      setSelectedItemForDelete(undefined);
    }, []);

    const handleArtifactFlyoutOnSuccess = useCallback(() => {
      refetchListData();
    }, [refetchListData]);

    if (isPageInitializing) {
      return <ManagementPageLoader data-test-subj={getTestId('pageLoader')} />;
    }

    return (
      <AdministrationListPage
        headerBackComponent={backButtonHeaderComponent}
        hideHeader={!doesDataExist}
        title={labels.pageTitle}
        subtitle={labels.pageAboutInfo}
        actions={
          <EuiButton
            fill
            iconType="plusInCircle"
            isDisabled={isFlyoutOpened}
            onClick={handleOpenCreateFlyoutClick}
            data-test-subj={getTestId('pageAddButton')}
          >
            {labels.pageAddButtonTitle}
          </EuiButton>
        }
      >
        {/* Flyout component is driven by URL params and may or may not be displayed based on those */}
        <MaybeArtifactFlyout
          apiClient={apiClient}
          item={selectedItemForEdit}
          onSuccess={handleArtifactFlyoutOnSuccess}
          FormComponent={ArtifactFormComponent}
          labels={labels}
          data-test-subj={getTestId('flyout')}
        />

        {selectedItemForDelete && (
          <ArtifactDeleteModal
            apiClient={apiClient}
            item={selectedItemForDelete}
            labels={labels}
            data-test-subj={getTestId('deleteModal')}
            onSuccess={handleArtifactDeleteModalOnSuccess}
            onCancel={handleArtifactDeleteModalOnCancel}
          />
        )}

        {!doesDataExist ? (
          <NoDataEmptyState
            onAdd={handleOpenCreateFlyoutClick}
            titleLabel={labels.emptyStateTitle}
            aboutInfo={labels.emptyStateInfo}
            primaryButtonLabel={labels.emptyStatePrimaryButtonLabel}
            backComponent={backButtonEmptyComponent}
            data-test-subj={getTestId('emptyState')}
          />
        ) : (
          <>
            <SearchExceptions
              defaultValue={filter}
              onSearch={handleOnSearch}
              placeholder={labels.searchPlaceholderInfo}
              hasPolicyFilter
              policyList={policiesRequest.data?.items}
              defaultIncludedPolicies={includedPolicies}
            />

            <EuiSpacer size="m" />

            <EuiText color="subdued" size="xs" data-test-subj={getTestId('showCount')}>
              {labels.getShowingCountLabel(uiPagination.totalItemCount)}
            </EuiText>

            <EuiSpacer size="s" />

            <PaginatedContent<ExceptionListItemSchema, ArtifactEntryCardType>
              items={items}
              ItemComponent={ArtifactEntryCard}
              itemComponentProps={handleCardProps}
              onChange={handlePaginationChange}
              error={error}
              loading={isLoading}
              pagination={uiPagination}
              contentClassName="card-container"
              data-test-subj={getTestId('cardContent')}
            />
          </>
        )}
      </AdministrationListPage>
    );
  }
);
ArtifactListPage.displayName = 'ArtifactListPage';
