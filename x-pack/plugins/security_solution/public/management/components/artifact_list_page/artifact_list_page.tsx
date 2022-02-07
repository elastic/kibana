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
import { EuiFlyoutSize } from '@elastic/eui/src/components/flyout/flyout';
import { AdministrationListPage as _AdministrationListPage } from '../administration_list_page';

import { PaginatedContent } from '../paginated_content';

import { ArtifactEntryCard } from '../artifact_entry_card';

import { ArtifactListPageLabels, artifactListPageLabels } from './translations';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';
import { ManagementPageLoader } from '../management_page_loader';
import { SearchExceptions } from '../search_exceptions';
import { useArtifactCardPropsProvider } from './hooks/use_artifact_card_props_provider';
import { NoDataEmptyState } from './components/no_data_empty_state';
import { ArtifactFlyoutProps, MaybeArtifactFlyout } from './components/artifact_flyout';
import { useIsFlyoutOpened } from './hooks/use_is_flyout_opened';
import { useSetUrlParams } from './hooks/use_set_url_params';
import { useWithArtifactListData } from './hooks/use_with_artifact_list_data';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

type ArtifactEntryCardType = typeof ArtifactEntryCard;

const AdministrationListPage = styled(_AdministrationListPage)`
  // TODO:PT Ask David - why do we have this here? because the Card already has similar code:
  // https://github.com/elastic/kibana/blob/36ce6bda672c55551a175888fac0cf5131f5fd7f/x-pack/plugins/security_solution/public/management/components/artifact_entry_card/components/card_container_panel.tsx#L15
  // Maybe this should be moved there?
  .card-container > * {
    margin-bottom: ${({ theme }) => theme.eui.spacerSizes.l};

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

export interface ArtifactListPageProps {
  apiClient: ExceptionsListApiClient;
  /** The artifact Component that will be displayed in the Flyout for Create and Edit flows */
  ArtifactFormComponent: ArtifactFlyoutProps['FormComponent'];
  flyoutSize?: EuiFlyoutSize;
  /** A list of labels for the given artifact page. Not all have to be defined, only those that should override the defaults */
  labels?: Partial<ArtifactListPageLabels>;
  'data-test-subj'?: string;
}

export const ArtifactListPage = memo<ArtifactListPageProps>(
  ({ apiClient, ArtifactFormComponent, labels: _labels = {}, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isFlyoutOpened = useIsFlyoutOpened();
    const setUrlParams = useSetUrlParams();

    const {
      isPageInitializing,
      isLoading,
      data: listDataResponse,
      uiPagination,
      doesDataExist,
      error,
    } = useWithArtifactListData(apiClient);

    const items = useMemo(() => {
      return listDataResponse?.data ?? [];
    }, [listDataResponse?.data]);

    const labels = useMemo<typeof artifactListPageLabels>(() => {
      return {
        ...artifactListPageLabels,
        ..._labels,
      };
    }, [_labels]);

    const handleCardProps = useArtifactCardPropsProvider({
      items,
      cardActionDeleteLabel: labels.cardActionDeleteLabel,
      cardActionEditLabel: labels.cardActionEditLabel,
      dataTestSubj: getTestId('card'),
    });

    const handleOpenCreateFlyoutClick = useCallback(() => {
      setUrlParams({ show: 'create' });
    }, [setUrlParams]);

    if (isPageInitializing) {
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
              isDisabled={isFlyoutOpened}
              onClick={handleOpenCreateFlyoutClick}
              data-test-subj={getTestId('pageAddButton')}
            >
              {labels.pageAddButtonTitle}
            </EuiButton>
          )
        }
      >
        {/* FIXME:PT implement callbacks */}
        {/* Flyout component is driven by URL params and may or may not be displayed based on those */}
        <MaybeArtifactFlyout
          apiClient={apiClient}
          onCancel={() => {}}
          onSuccess={() => {}}
          FormComponent={ArtifactFormComponent}
          labels={labels}
          data-test-subj={getTestId('flyout')}
        />

        {/* {showDelete && <EventFilterDeleteModal />}*/}

        {!doesDataExist && (
          <NoDataEmptyState
            onAdd={handleOpenCreateFlyoutClick}
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
                labels.getShowingCountLabel(0) // FIXME:PT provide total count
              }
            </EuiText>

            <EuiSpacer size="s" />

            <PaginatedContent<ExceptionListItemSchema, ArtifactEntryCardType>
              items={items}
              ItemComponent={ArtifactEntryCard}
              itemComponentProps={handleCardProps}
              onChange={() => {}} // FIXME:PT implement change handler
              error={error}
              loading={isLoading}
              pagination={uiPagination}
              contentClassName="card-container"
              data-test-subj={getTestId('cardContent')}
              noItemsMessage={<>{'no items'}</>} // FIXME: implement no results message
            />
          </>
        )}

        {/* ----------------------------- DEV ONLY ----------------------------- */}
        {/* ----------------------------- DEV ONLY ----------------------------- */}
        {/* ----------------------------- DEV ONLY ----------------------------- */}
        <EuiCallOut style={{ marginTop: '3em' }} color="danger">
          <p style={{ fontSize: '8em' }}>{'ALPHA - In development'}</p>
        </EuiCallOut>
        {/* ----------------------------- DEV ONLY ----------------------------- */}
        {/* ----------------------------- DEV ONLY ----------------------------- */}
        {/* ----------------------------- DEV ONLY ----------------------------- */}
      </AdministrationListPage>
    );
  }
);
ArtifactListPage.displayName = 'ArtifactListPage';
