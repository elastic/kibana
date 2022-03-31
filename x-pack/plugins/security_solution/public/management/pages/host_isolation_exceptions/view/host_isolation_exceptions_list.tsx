/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { memo } from 'react';
import { useHttp } from '../../../../common/lib/kibana';
import { ArtifactListPage } from '../../../components/artifact_list_page';
import type { ArtifactListPageProps } from '../../../components/artifact_list_page';
import { HostIsolationExceptionsApiClient } from '../host_isolation_exceptions_api_client';

const HOST_ISOLATION_EXCEPTIONS_LABELS: ArtifactListPageProps['labels'] = Object.freeze({
  pageTitle: i18n.translate('xpack.securitySolution.hostIsolationExceptions.pageTitle', {
    defaultMessage: 'Blocklist',
  }),
  pageAboutInfo: i18n.translate('xpack.securitySolution.hostIsolationExceptions.pageAboutInfo', {
    defaultMessage:
      'The host isolation exception prevents selected applications from running on your hosts by extending the list of processes the Endpoint considers malicious.',
  }),
  pageAddButtonTitle: i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.pageAddButtonTitle',
    {
      defaultMessage: 'Add host isolation exception entry',
    }
  ),
  getShowingCountLabel: (total) =>
    i18n.translate('xpack.securitySolution.hostIsolationExceptions.showingTotal', {
      defaultMessage:
        'Showing {total} {total, plural, one {host isolation exception entry} other {host isolation exception entries}}',
      values: { total },
    }),
  cardActionEditLabel: i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.cardActionEditLabel',
    {
      defaultMessage: 'Edit host isolation exception',
    }
  ),
  cardActionDeleteLabel: i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.cardActionDeleteLabel',
    {
      defaultMessage: 'Delete host isolation exception',
    }
  ),
  flyoutCreateTitle: i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.flyoutCreateTitle',
    {
      defaultMessage: 'Add host isolation exception',
    }
  ),
  flyoutEditTitle: i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.flyoutEditTitle',
    {
      defaultMessage: 'Edit host isolation exception',
    }
  ),
  flyoutCreateSubmitButtonLabel: i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.flyoutCreateSubmitButtonLabel',
    { defaultMessage: 'Add host isolation exception' }
  ),
  flyoutCreateSubmitSuccess: ({ name }) =>
    i18n.translate('xpack.securitySolution.hostIsolationExceptions.flyoutCreateSubmitSuccess', {
      defaultMessage: '"{name}" has been added to your host isolation exception.', // FIXME: match this to design (needs count of items)
      values: { name },
    }),
  flyoutEditSubmitSuccess: ({ name }) =>
    i18n.translate('xpack.securitySolution.hostIsolationExceptions.flyoutEditSubmitSuccess', {
      defaultMessage: '"{name}" has been updated.',
      values: { name },
    }),
  flyoutDowngradedLicenseDocsInfo: () => {
    return 'tbd...';
    // FIXME: define docs link for license downgrade message. sample code below

    // const { docLinks } = useKibana().services;
    // return (
    //   <FormattedMessage
    //     id="some-id-1"
    //     defaultMessage="For more information, see our {link}."
    //     value={{
    //       link: (
    //         <EuiLink target="_blank" href={`${docLinks.links.securitySolution.eventFilters}`}>
    //           {' '}
    //           <FormattedMessage
    //             id="dome-id-2"
    //             defaultMessage="Event filters documentation"
    //           />{' '}
    //         </EuiLink>
    //       ),
    //     }}
    //   />
    // );
  },
  deleteActionSuccess: (itemName) =>
    i18n.translate('xpack.securitySolution.hostIsolationExceptions.deleteSuccess', {
      defaultMessage: '"{itemName}" has been removed from host isolation exception.',
      values: { itemName },
    }),
  emptyStateTitle: i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.emptyStateTitle',
    {
      defaultMessage: 'Add your first host isolation exception',
    }
  ),
  emptyStateInfo: i18n.translate('xpack.securitySolution.hostIsolationExceptions.emptyStateInfo', {
    defaultMessage: 'Add a host isolation exception to prevent execution on the endpoint',
  }),
  emptyStatePrimaryButtonLabel: i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.emptyStatePrimaryButtonLabel',
    { defaultMessage: 'Add host isolation exception' }
  ),
  searchPlaceholderInfo: i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.searchPlaceholderInfo',
    {
      defaultMessage: 'Search on the fields below: name, description, value',
    }
  ),
});

const TempForm = () => <div>{'FORM GOES HERE'}</div>;

export const HostIsolationExceptionsList = memo(() => {
  const http = useHttp();
  const hostIsolationExceptionsApiClient = HostIsolationExceptionsApiClient.getInstance(http);

  return (
    <ArtifactListPage
      apiClient={hostIsolationExceptionsApiClient}
      ArtifactFormComponent={TempForm}
      labels={HOST_ISOLATION_EXCEPTIONS_LABELS}
      data-test-subj="hostIsolationExceptionsListPage"
    />
  );
});
HostIsolationExceptionsList.displayName = 'HostIsolationExceptionsList';

//
//
// FIXME:PT delete all code below once refactor is done
//
// type HostIsolationExceptionPaginatedContent = PaginatedContentProps<
//   Immutable<ExceptionListItemSchema>,
//   typeof ExceptionItem
// >;
//
// const getPaginationObject = ({
//   total = 0,
//   perPage = MANAGEMENT_DEFAULT_PAGE_SIZE,
//   page = 1,
// }: {
//   total?: number;
//   perPage?: number;
//   page?: number;
// }) => ({
//   totalItemCount: total,
//   pageSize: perPage,
//   pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
//   pageIndex: page - 1,
// });
//
// export const _HostIsolationExceptionsList = () => {
//   const history = useHistory();
//   const privileges = useUserPrivileges().endpointPrivileges;
//   const { state: routeState } = useLocation<ListPageRouteState | undefined>();
//
//   const location = useHostIsolationExceptionsSelector(getCurrentLocation);
//   const navigateCallback = useHostIsolationExceptionsNavigateCallback();
//
//   const memoizedRouteState = useMemoizedRouteState(routeState);
//
//   const backButtonEmptyComponent = useMemo(() => {
//     if (memoizedRouteState && memoizedRouteState.onBackButtonNavigateTo) {
//       return <BackToExternalAppSecondaryButton {...memoizedRouteState} />;
//     }
//   }, [memoizedRouteState]);
//
//   const backButtonHeaderComponent = useMemo(() => {
//     if (memoizedRouteState && memoizedRouteState.onBackButtonNavigateTo) {
//       return <BackToExternalAppButton {...memoizedRouteState} />;
//     }
//   }, [memoizedRouteState]);
//
//   const [itemToDelete, setItemToDelete] = useState<ExceptionListItemSchema | null>(null);
//
//   const includedPoliciesParam = location.included_policies;
//
//   const { isLoading, isRefetching, data, error, refetch } = useFetchHostIsolationExceptionsList({
//     filter: location.filter,
//     page: location.page_index,
//     perPage: location.page_size,
//     policies:
//       includedPoliciesParam && includedPoliciesParam !== ''
//         ? includedPoliciesParam.split(',')
//         : undefined,
//   });
//
//   const { isLoading: isLoadingAll, data: allData } = useFetchHostIsolationExceptionsList({
//     page: 0,
//     perPage: 1,
//     enabled: data && !data.total,
//   });
//
//   const toasts = useToasts();
//
//   // load the list of policies>
//   const policiesRequest = useGetEndpointSpecificPolicies({
//     onError: (err) => {
//       toasts.addDanger(getLoadPoliciesError(err));
//     },
//   });
//
//   const pagination = getPaginationObject({
//     total: data?.total,
//     perPage: data?.per_page,
//     page: data?.page,
//   });
//
//   const listItems = data?.data || [];
//   const allListItems = allData?.data || [];
//
//   const showFlyout = privileges.canIsolateHost && !!location.show;
//   const hasDataToShow = allListItems.length > 0 || listItems.length > 0;
//
//   useEffect(() => {
//     if (!isLoading && listItems.length === 0 && !privileges.canIsolateHost) {
//       history.replace(getEndpointListPath({ name: 'endpointList' }));
//     }
//   }, [history, isLoading, listItems.length, privileges.canIsolateHost]);
//
//   const handleOnSearch = useCallback(
//     (filter: string, includedPolicies: string) => {
//       navigateCallback({
//         filter,
//         included_policies: includedPolicies,
//       });
//     },
//     [navigateCallback]
//   );
//
//   const artifactCardPolicies = useEndpointPoliciesToArtifactPolicies(policiesRequest.data?.items);
//
//   function handleItemComponentProps(element: ExceptionListItemSchema): ArtifactEntryCardProps {
//     const editAction = {
//       icon: 'controlsHorizontal',
//       onClick: () => {
//         navigateCallback({
//           show: 'edit',
//           id: element.id,
//         });
//       },
//       'data-test-subj': 'editHostIsolationException',
//       children: EDIT_HOST_ISOLATION_EXCEPTION_LABEL,
//     };
//     const deleteAction = {
//       icon: 'trash',
//       onClick: () => {
//         setItemToDelete(element);
//       },
//       'data-test-subj': 'deleteHostIsolationException',
//       children: DELETE_HOST_ISOLATION_EXCEPTION_LABEL,
//     };
//     return {
//       item: element,
//       'data-test-subj': `hostIsolationExceptionsCard`,
//       actions: privileges.canIsolateHost ? [editAction, deleteAction] : [deleteAction],
//       policies: artifactCardPolicies,
//       hideDescription: !element.description,
//       hideComments: !element.comments.length,
//     };
//   }
//
//   const handlePaginatedContentChange: HostIsolationExceptionPaginatedContent['onChange'] =
//     useCallback(
//       ({ pageIndex, pageSize }) => {
//         navigateCallback({
//           page_index: pageIndex,
//           page_size: pageSize,
//         });
//       },
//       [navigateCallback]
//     );
//
//   const handleAddButtonClick = useCallback(
//     () =>
//       navigateCallback({
//         show: 'create',
//         id: undefined,
//       }),
//     [navigateCallback]
//   );
//
//   const handleCloseDeleteDialog = (forceRefresh: boolean = false) => {
//     if (forceRefresh) {
//       refetch();
//     }
//     setItemToDelete(null);
//   };
//
//   const handleCloseFlyout = useCallback(
//     () =>
//       navigateCallback({
//         show: undefined,
//         id: undefined,
//       }),
//     [navigateCallback]
//   );
//
//   const isSearchLoading = isLoading || isRefetching;
//
//   if ((isSearchLoading || isLoadingAll) && !hasDataToShow) {
//     return <ManagementPageLoader data-test-subj="hostIsolationExceptionListLoader" />;
//   }
//
//   return (
//     <AdministrationListPage
//       headerBackComponent={backButtonHeaderComponent}
//       title={
//         <FormattedMessage
//           id="xpack.securitySolution.hostIsolationExceptions.list.pageTitle"
//           defaultMessage="Host isolation exceptions"
//         />
//       }
//       subtitle={
//         <FormattedMessage
//           id="xpack.securitySolution.hostIsolationExceptions.list.pageSubTitle"
//           defaultMessage="Add a host isolation exception to allow isolated hosts to communicate with specific IPs."
//         />
//       }
//       actions={
//         privileges.canIsolateHost && hasDataToShow ? (
//           <EuiButton
//             fill
//             iconType="plusInCircle"
//             isDisabled={showFlyout}
//             onClick={handleAddButtonClick}
//             data-test-subj="hostIsolationExceptionsListAddButton"
//           >
//             <FormattedMessage
//               id="xpack.securitySolution.hostIsolationExceptions.list.addButton"
//               defaultMessage="Add host isolation exception"
//             />
//           </EuiButton>
//         ) : (
//           []
//         )
//       }
//       hideHeader={!hasDataToShow}
//     >
//       {showFlyout && (
//         <HostIsolationExceptionsFormFlyout onCancel={handleCloseFlyout} id={location.id} />
//       )}
//
//       {itemToDelete ? (
//         <HostIsolationExceptionDeleteModal item={itemToDelete} onCancel={handleCloseDeleteDialog} />
//       ) : null}
//
//       {hasDataToShow ? (
//         <>
//           <SearchExceptions
//             defaultValue={location.filter}
//             onSearch={handleOnSearch}
//             policyList={policiesRequest.data?.items}
//             hasPolicyFilter
//             defaultIncludedPolicies={location.included_policies}
//             placeholder={i18n.translate(
//               'xpack.securitySolution.hostIsolationExceptions.search.placeholder',
//               {
//                 defaultMessage: 'Search on the fields below: name, description, IP',
//               }
//             )}
//           />
//           <EuiSpacer size="m" />
//           <EuiText color="subdued" size="xs" data-test-subj="hostIsolationExceptions-totalCount">
//             <FormattedMessage
//               id="xpack.securitySolution.hostIsolationExceptions.list.totalCount"
//               defaultMessage="Showing {total, plural, one {# host isolation exception} other {# host isolation exceptions}}"
//               values={{ total: listItems.length }}
//             />
//           </EuiText>
//           <EuiSpacer size="s" />
//         </>
//       ) : null}
//
//       <PaginatedContent<ExceptionListItemSchema, typeof ArtifactEntryCard>
//         items={listItems}
//         ItemComponent={ArtifactEntryCard}
//         itemComponentProps={handleItemComponentProps}
//         onChange={handlePaginatedContentChange}
//         error={error?.message}
//         loading={isSearchLoading}
//         pagination={pagination}
//         contentClassName="host-isolation-exceptions-container"
//         data-test-subj="hostIsolationExceptionsContent"
//         noItemsMessage={
//           !hasDataToShow && (
//             <HostIsolationExceptionsEmptyState
//               onAdd={handleAddButtonClick}
//               backComponent={backButtonEmptyComponent}
//             />
//           )
//         }
//       />
//     </AdministrationListPage>
//   );
// };
//
// _HostIsolationExceptionsList.displayName = 'HostIsolationExceptionsList';
