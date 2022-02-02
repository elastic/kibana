/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Immutable, ListPageRouteState } from '../../../../../common/endpoint/types';
import { ExceptionItem } from '../../../../common/components/exceptions/viewer/exception_item';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useToasts } from '../../../../common/lib/kibana';
import {
  MANAGEMENT_DEFAULT_PAGE_SIZE,
  MANAGEMENT_PAGE_SIZE_OPTIONS,
} from '../../../common/constants';
import { getEndpointListPath } from '../../../common/routing';
import { getLoadPoliciesError } from '../../../common/translations';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { ArtifactEntryCard, ArtifactEntryCardProps } from '../../../components/artifact_entry_card';
import { useEndpointPoliciesToArtifactPolicies } from '../../../components/artifact_entry_card/hooks/use_endpoint_policies_to_artifact_policies';
import { BackToExternalAppSecondaryButton } from '../../../components/back_to_external_app_secondary_button';
import { BackToExternalAppButton } from '../../../components/back_to_external_app_button';
import { ManagementPageLoader } from '../../../components/management_page_loader';
import { PaginatedContent, PaginatedContentProps } from '../../../components/paginated_content';
import { SearchExceptions } from '../../../components/search_exceptions';
import { useGetEndpointSpecificPolicies } from '../../../services/policies/hooks';
import { getCurrentLocation } from '../store/selector';
import { HostIsolationExceptionDeleteModal } from './components/delete_modal';
import { HostIsolationExceptionsEmptyState } from './components/empty';
import { HostIsolationExceptionsFormFlyout } from './components/form_flyout';
import {
  DELETE_HOST_ISOLATION_EXCEPTION_LABEL,
  EDIT_HOST_ISOLATION_EXCEPTION_LABEL,
} from './components/translations';
import {
  useFetchHostIsolationExceptionsList,
  useHostIsolationExceptionsNavigateCallback,
  useHostIsolationExceptionsSelector,
} from './hooks';
import { useMemoizedRouteState } from '../../../common/hooks';

type HostIsolationExceptionPaginatedContent = PaginatedContentProps<
  Immutable<ExceptionListItemSchema>,
  typeof ExceptionItem
>;

const getPaginationObject = ({
  total = 0,
  perPage = MANAGEMENT_DEFAULT_PAGE_SIZE,
  page = 1,
}: {
  total?: number;
  perPage?: number;
  page?: number;
}) => ({
  totalItemCount: total,
  pageSize: perPage,
  pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
  pageIndex: page - 1,
});

export const HostIsolationExceptionsList = () => {
  const history = useHistory();
  const privileges = useUserPrivileges().endpointPrivileges;
  const { state: routeState } = useLocation<ListPageRouteState | undefined>();

  const location = useHostIsolationExceptionsSelector(getCurrentLocation);
  const navigateCallback = useHostIsolationExceptionsNavigateCallback();

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

  const [itemToDelete, setItemToDelete] = useState<ExceptionListItemSchema | null>(null);

  const includedPoliciesParam = location.included_policies;

  const { isLoading, isRefetching, data, error, refetch } = useFetchHostIsolationExceptionsList({
    filter: location.filter,
    page: location.page_index,
    perPage: location.page_size,
    policies:
      includedPoliciesParam && includedPoliciesParam !== ''
        ? includedPoliciesParam.split(',')
        : undefined,
  });

  const { isLoading: isLoadingAll, data: allData } = useFetchHostIsolationExceptionsList({
    page: 0,
    perPage: 1,
    enabled: data && !data.total,
  });

  const toasts = useToasts();

  // load the list of policies>
  const policiesRequest = useGetEndpointSpecificPolicies({
    onError: (err) => {
      toasts.addDanger(getLoadPoliciesError(err));
    },
  });

  const pagination = getPaginationObject({
    total: data?.total,
    perPage: data?.per_page,
    page: data?.page,
  });

  const listItems = data?.data || [];
  const allListItems = allData?.data || [];

  const showFlyout = privileges.canIsolateHost && !!location.show;
  const hasDataToShow = allListItems.length > 0 || listItems.length > 0;

  useEffect(() => {
    if (!isLoading && listItems.length === 0 && !privileges.canIsolateHost) {
      history.replace(getEndpointListPath({ name: 'endpointList' }));
    }
  }, [history, isLoading, listItems.length, privileges.canIsolateHost]);

  const handleOnSearch = useCallback(
    (filter: string, includedPolicies: string) => {
      navigateCallback({
        filter,
        included_policies: includedPolicies,
      });
    },
    [navigateCallback]
  );

  const artifactCardPolicies = useEndpointPoliciesToArtifactPolicies(policiesRequest.data?.items);

  function handleItemComponentProps(element: ExceptionListItemSchema): ArtifactEntryCardProps {
    const editAction = {
      icon: 'controlsHorizontal',
      onClick: () => {
        navigateCallback({
          show: 'edit',
          id: element.id,
        });
      },
      'data-test-subj': 'editHostIsolationException',
      children: EDIT_HOST_ISOLATION_EXCEPTION_LABEL,
    };
    const deleteAction = {
      icon: 'trash',
      onClick: () => {
        setItemToDelete(element);
      },
      'data-test-subj': 'deleteHostIsolationException',
      children: DELETE_HOST_ISOLATION_EXCEPTION_LABEL,
    };
    return {
      item: element,
      'data-test-subj': `hostIsolationExceptionsCard`,
      actions: privileges.canIsolateHost ? [editAction, deleteAction] : [deleteAction],
      policies: artifactCardPolicies,
      hideDescription: !element.description,
      hideComments: !element.comments.length,
    };
  }

  const handlePaginatedContentChange: HostIsolationExceptionPaginatedContent['onChange'] =
    useCallback(
      ({ pageIndex, pageSize }) => {
        navigateCallback({
          page_index: pageIndex,
          page_size: pageSize,
        });
      },
      [navigateCallback]
    );

  const handleAddButtonClick = useCallback(
    () =>
      navigateCallback({
        show: 'create',
        id: undefined,
      }),
    [navigateCallback]
  );

  const handleCloseDeleteDialog = (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      refetch();
    }
    setItemToDelete(null);
  };

  const handleCloseFlyout = useCallback(
    () =>
      navigateCallback({
        show: undefined,
        id: undefined,
      }),
    [navigateCallback]
  );

  const isSearchLoading = isLoading || isRefetching;

  if ((isSearchLoading || isLoadingAll) && !hasDataToShow) {
    return <ManagementPageLoader data-test-subj="hostIsolationExceptionListLoader" />;
  }

  return (
    <AdministrationListPage
      headerBackComponent={backButtonHeaderComponent}
      title={
        <FormattedMessage
          id="xpack.securitySolution.hostIsolationExceptions.list.pageTitle"
          defaultMessage="Host isolation exceptions"
        />
      }
      subtitle={
        <FormattedMessage
          id="xpack.securitySolution.hostIsolationExceptions.list.pageSubTitle"
          defaultMessage="Add a host isolation exception to allow isolated hosts to communicate with specific IPs."
        />
      }
      actions={
        privileges.canIsolateHost && hasDataToShow ? (
          <EuiButton
            fill
            iconType="plusInCircle"
            isDisabled={showFlyout}
            onClick={handleAddButtonClick}
            data-test-subj="hostIsolationExceptionsListAddButton"
          >
            <FormattedMessage
              id="xpack.securitySolution.hostIsolationExceptions.list.addButton"
              defaultMessage="Add host isolation exception"
            />
          </EuiButton>
        ) : (
          []
        )
      }
      hideHeader={!hasDataToShow}
    >
      {showFlyout && (
        <HostIsolationExceptionsFormFlyout onCancel={handleCloseFlyout} id={location.id} />
      )}

      {itemToDelete ? (
        <HostIsolationExceptionDeleteModal item={itemToDelete} onCancel={handleCloseDeleteDialog} />
      ) : null}

      {hasDataToShow ? (
        <>
          <SearchExceptions
            defaultValue={location.filter}
            onSearch={handleOnSearch}
            policyList={policiesRequest.data?.items}
            hasPolicyFilter
            defaultIncludedPolicies={location.included_policies}
            placeholder={i18n.translate(
              'xpack.securitySolution.hostIsolationExceptions.search.placeholder',
              {
                defaultMessage: 'Search on the fields below: name, description, IP',
              }
            )}
          />
          <EuiSpacer size="m" />
          <EuiText color="subdued" size="xs" data-test-subj="hostIsolationExceptions-totalCount">
            <FormattedMessage
              id="xpack.securitySolution.hostIsolationExceptions.list.totalCount"
              defaultMessage="Showing {total, plural, one {# host isolation exception} other {# host isolation exceptions}}"
              values={{ total: listItems.length }}
            />
          </EuiText>
          <EuiSpacer size="s" />
        </>
      ) : null}

      <PaginatedContent<ExceptionListItemSchema, typeof ArtifactEntryCard>
        items={listItems}
        ItemComponent={ArtifactEntryCard}
        itemComponentProps={handleItemComponentProps}
        onChange={handlePaginatedContentChange}
        error={error?.message}
        loading={isSearchLoading}
        pagination={pagination}
        contentClassName="host-isolation-exceptions-container"
        data-test-subj="hostIsolationExceptionsContent"
        noItemsMessage={
          !hasDataToShow && (
            <HostIsolationExceptionsEmptyState
              onAdd={handleAddButtonClick}
              backComponent={backButtonEmptyComponent}
            />
          )
        }
      />
    </AdministrationListPage>
  );
};

HostIsolationExceptionsList.displayName = 'HostIsolationExceptionsList';
