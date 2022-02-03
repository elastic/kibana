/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import styled from 'styled-components';

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EuiButton, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { AdministrationListPage as _AdministrationListPage } from '../administration_list_page';

import { PaginatedContent } from '../paginated_content';

import { ArtifactEntryCard } from '../artifact_entry_card';

import { MANAGEMENT_DEFAULT_PAGE_SIZE, MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../common/constants';
import { artifactListPageLabels } from './translations';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';
import { ManagementPageLoader } from '../management_page_loader';
import { SearchExceptions } from '../search_exceptions';

type ArtifactEntryCardType = typeof ArtifactEntryCard;

// type EventListPaginatedContent = PaginatedContentProps<
//   Immutable<ExceptionListItemSchema>,
//   typeof ExceptionItem
// >;

const AdministrationListPage = styled(_AdministrationListPage)`
  .event-filter-container > * {
    margin-bottom: ${({ theme }) => theme.eui.spacerSizes.l};

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

export interface ArtifactListPageProps {
  apiClient: unknown; // ExceptionsListApiClient;
  /** A list of labels for the given artifact page. */
  labels?: Partial<typeof artifactListPageLabels>;
  'data-test-subj'?: string;
}

export const ArtifactListPage = memo<ArtifactListPageProps>(
  ({ labels: _labels = {}, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const labels = useMemo<typeof artifactListPageLabels>(() => {
      return {
        ...artifactListPageLabels,
        ..._labels,
      };
    }, [_labels]);

    const isLoading = false; // FIXME: implement
    const doesDataExist = true; // FIXME: implement

    // const handleAddButtonClick = useCallback(
    // () =>
    //   navigateCallback({
    //     show: 'create',
    //     id: undefined,
    //   }),
    // [navigateCallback]
    // );

    // const handleCancelButtonClick = useCallback(
    //   () =>
    //     navigateCallback({
    //       show: undefined,
    //       id: undefined,
    //     }),
    //   [navigateCallback]
    // );
    //
    // const handlePaginatedContentChange: EventListPaginatedContent['onChange'] = useCallback(
    //   ({ pageIndex, pageSize }) => {
    //     navigateCallback({
    //       page_index: pageIndex,
    //       page_size: pageSize,
    //     });
    //   },
    //   [navigateCallback]
    // );
    //
    // const handleOnSearch = useCallback(
    //   (query: string, includedPolicies?: string) => {
    //     dispatch({ type: 'eventFiltersForceRefresh', payload: { forceRefresh: true } });
    //     navigateCallback({ filter: query, included_policies: includedPolicies });
    //   },
    //   [navigateCallback, dispatch]
    // );
    //
    // const artifactCardPropsPerItem = useMemo(() => {
    //   const cachedCardProps: Record<string, ArtifactEntryCardProps> = {};
    //
    //   // Casting `listItems` below to remove the `Immutable<>` from it in order to prevent errors
    //   // with common component's props
    //   for (const eventFilter of listItems as ExceptionListItemSchema[]) {
    //     cachedCardProps[eventFilter.id] = {
    //       item: eventFilter as AnyArtifact,
    //       policies: artifactCardPolicies,
    //       'data-test-subj': 'eventFilterCard',
    //       actions: [
    //         {
    //           icon: 'controlsHorizontal',
    //           onClick: () => {
    //             history.push(
    //               getEventFiltersListPath({
    //                 ...location,
    //                 show: 'edit',
    //                 id: eventFilter.id,
    //               })
    //             );
    //           },
    //           'data-test-subj': 'editEventFilterAction',
    //           children: EDIT_EVENT_FILTER_ACTION_LABEL,
    //         },
    //         {
    //           icon: 'trash',
    //           onClick: () => {
    //             dispatch({
    //               type: 'eventFilterForDeletion',
    //               payload: eventFilter,
    //             });
    //           },
    //           'data-test-subj': 'deleteEventFilterAction',
    //           children: DELETE_EVENT_FILTER_ACTION_LABEL,
    //         },
    //       ],
    //       hideDescription: !eventFilter.description,
    //       hideComments: !eventFilter.comments.length,
    //     };
    //   }
    //
    //   return cachedCardProps;
    // }, [artifactCardPolicies, dispatch, history, listItems, location]);
    //
    // const handleArtifactCardProps = useCallback(
    //   (eventFilter: ExceptionListItemSchema) => {
    //     return artifactCardPropsPerItem[eventFilter.id];
    //   },
    //   [artifactCardPropsPerItem]
    // );

    if (isLoading && !doesDataExist) {
      return <ManagementPageLoader data-test-subj={getTestId('pageLoader')} />;
    }

    return (
      <AdministrationListPage
        // FIXME: header back component
        // headerBackComponent={backButtonHeaderComponent}
        title={labels.pageTitle}
        subtitle={labels.pageAboutInfo}
        actions={
          doesDataExist && (
            <EuiButton
              fill
              iconType="plusInCircle"
              isDisabled={false} // FIXME: should be conditional if panel is opened
              onClick={() => {}} // FIXME: implement
              data-test-subj={getTestId('pageAddButton')}
            >
              {labels.pageAddButtonTitle}
            </EuiButton>
          )
        }
        hideHeader={false} // FIXME: implement if no data
      >
        {/* {showFlyout && (*/}
        {/*  <EventFiltersFlyout*/}
        {/*    onCancel={handleCancelButtonClick}*/}
        {/*    id={location.id}*/}
        {/*    type={location.show}*/}
        {/*  />*/}
        {/* )}*/}

        {/* {showDelete && <EventFilterDeleteModal />}*/}

        {doesDataExist && (
          <>
            <SearchExceptions
              defaultValue={''} // FIXME:PT get from url
              onSearch={() => {}} // FIXME:PT handle search
              placeholder={labels.searchPlaceholderInfo}
              hasPolicyFilter
              policyList={[]} // FIXME:PT provide list of policies
              defaultIncludedPolicies={''} // FIXME:PT provide list of included policies
            />
            <EuiSpacer size="m" />
            <EuiText color="subdued" size="xs" data-test-subj={getTestId('showCount')}>
              {
                // FIXME:PT provide total count
                labels.getShowingCountLabel(0)
              }
            </EuiText>
            <EuiSpacer size="s" />
          </>
        )}

        <PaginatedContent<ExceptionListItemSchema, ArtifactEntryCardType>
          items={[]}
          ItemComponent={ArtifactEntryCard}
          itemComponentProps={() => {}}
          onChange={() => {}}
          error={undefined}
          loading={false}
          pagination={{
            totalItemCount: 0,
            pageSize: MANAGEMENT_DEFAULT_PAGE_SIZE,
            pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
            pageIndex: 0,
          }}
          contentClassName="event-filter-container"
          data-test-subj={getTestId('cardContent')}
          noItemsMessage={<>{'no items'}</>} // FIXME: implement no results message
        />

        <EuiCallOut style={{ marginTop: '3em' }} color="danger">
          <p>{'ALPHA - In development'}</p>
        </EuiCallOut>
      </AdministrationListPage>
    );
  }
);
ArtifactListPage.displayName = 'ArtifactListPage';
