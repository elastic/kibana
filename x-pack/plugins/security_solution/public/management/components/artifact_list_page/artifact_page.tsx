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
import { useArtifactCardPropsProvider } from './hooks/use_artifact_card_props_provider';
import { NoDataEmptyState } from './components/no_data_empty_state';

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
  /** The artifact Component that will be displayed in the Flyout for Create and Edit flows */
  ArtifactForm: React.ComponentType;
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

    const handleCardProps = useArtifactCardPropsProvider({
      artifacts: [],
      policies: {},
      cardActionDeleteLabel: labels.cardActionDeleteLabel,
      cardActionEditLabel: labels.cardActionEditLabel,
      dataTestSubj: getTestId('card'),
    });

    const isLoading = false; // FIXME: implement
    const doesDataExist = false; // FIXME: implement

    if (isLoading && !doesDataExist) {
      return <ManagementPageLoader data-test-subj={getTestId('pageLoader')} />;
    }

    return (
      <AdministrationListPage
        // FIXME: header back component
        // headerBackComponent={backButtonHeaderComponent}
        hideHeader={!doesDataExist}
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
      >
        {/* {showFlyout && (*/}
        {/*  <EventFiltersFlyout*/}
        {/*    onCancel={handleCancelButtonClick}*/}
        {/*    id={location.id}*/}
        {/*    type={location.show}*/}
        {/*  />*/}
        {/* )}*/}

        {/* {showDelete && <EventFilterDeleteModal />}*/}

        {!doesDataExist && (
          <NoDataEmptyState
            onAdd={() => {}}
            titleLabel={labels.emptyStateTitle}
            aboutInfo={labels.emptyStateInfo}
            primaryButtonLabel={labels.emptyStatePrimaryButtonLabel}
            // FIXME:PT implement back component
            // backComponent={}
          />
        )}

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

            <PaginatedContent<ExceptionListItemSchema, ArtifactEntryCardType>
              items={[]}
              ItemComponent={ArtifactEntryCard}
              itemComponentProps={handleCardProps}
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
          </>
        )}

        {/* DEV ONLY */}
        {/* DEV ONLY */}
        {/* DEV ONLY */}
        <EuiCallOut style={{ marginTop: '3em' }} color="danger">
          <p>{'ALPHA - In development'}</p>
        </EuiCallOut>
        {/* DEV ONLY */}
        {/* DEV ONLY */}
        {/* DEV ONLY */}
      </AdministrationListPage>
    );
  }
);
ArtifactListPage.displayName = 'ArtifactListPage';
