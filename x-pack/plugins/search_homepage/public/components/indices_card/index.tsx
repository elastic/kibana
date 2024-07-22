/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useIndices } from '../../hooks/api/use_indices';
import { IndicesEmptyState } from './empty_state';
import { IndicesList } from './indices_list';
import './indices_card.scss';
import { getErrorMessage } from '../../utils/get_error_message';
import { useUsageTracker } from '../../hooks/use_usage_tracker';

enum IndicesCardContentView {
  Loading,
  Error,
  Empty,
  Data,
}

export interface IndicesCardProps {
  onCreateIndex: () => void;
}

export const IndicesCard = ({ onCreateIndex }: IndicesCardProps) => {
  const usageTracker = useUsageTracker();
  const [searchField, setSearchField] = useState<string>('');
  const [indicesSearchQuery, setIndicesSearchQuery] = useState<string>('');
  const { data, error, isLoading, isFetching } = useIndices(indicesSearchQuery);

  const onSearch = useCallback((value: string) => {
    const trimSearch = value.trim();
    setSearchField(trimSearch);
    setIndicesSearchQuery(trimSearch);
  }, []);
  const onChangeSearchField = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newSearchField = e.target.value;
      const runSearch = searchField.length > 0 && newSearchField.length === 0;
      setSearchField(newSearchField);
      if (runSearch) {
        onSearch(newSearchField);
      }
    },
    [searchField, onSearch]
  );
  const onAddDataClick = useCallback(() => {
    usageTracker.click('indices-card-add-data');
    onCreateIndex();
  }, [usageTracker, onCreateIndex]);

  const isEmptyData = data && data.indices.length === 0 && indicesSearchQuery.length === 0;
  const view =
    isLoading && !data
      ? IndicesCardContentView.Loading
      : error
      ? IndicesCardContentView.Error
      : isEmptyData
      ? IndicesCardContentView.Empty
      : IndicesCardContentView.Data;
  return (
    <EuiPanel hasBorder style={{ width: '100%', position: 'relative' }}>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" style={{ width: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <EuiText>
              <FormattedMessage
                id="xpack.searchHomepage.indicesCard.title"
                defaultMessage="Indices"
              />
            </EuiText>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      {view === IndicesCardContentView.Loading ? <Loading /> : null}
      {view === IndicesCardContentView.Empty ? (
        <IndicesEmptyState onCreateIndex={onCreateIndex} />
      ) : null}
      {view === IndicesCardContentView.Error || view === IndicesCardContentView.Data ? (
        <>
          <EuiFlexItem>
            <EuiFieldSearch
              fullWidth
              data-test-subj="indicesCard-search-field"
              placeholder={i18n.translate(
                'xpack.searchHomepage.indicesCard.indexSearch.placeholder',
                { defaultMessage: 'Search indices' }
              )}
              value={searchField}
              aria-label={i18n.translate('xpack.searchHomepage.indicesCard.indexSearch.ariaLabel', {
                defaultMessage: 'Search for indices',
              })}
              onChange={onChangeSearchField}
              onSearch={onSearch}
              isLoading={isFetching}
            />
          </EuiFlexItem>
          <EuiSpacer size="s" />
          {view === IndicesCardContentView.Error ? (
            <EuiFlexItem>
              <Error error={error} />
            </EuiFlexItem>
          ) : null}
          {view === IndicesCardContentView.Data ? (
            <>
              <IndicesList indices={data?.indices ?? []} />
              <EuiSpacer size="s" />
              <EuiButton
                fullWidth
                color="primary"
                iconType="plusInCircleFilled"
                onClick={onAddDataClick}
                data-test-subj="indicesCard-add-data-button"
              >
                <FormattedMessage
                  id="xpack.searchHomepage.indicesCard.addData.text"
                  defaultMessage="Add Data"
                />
              </EuiButton>
            </>
          ) : null}
        </>
      ) : null}
    </EuiPanel>
  );
};

const Loading = () => (
  <EuiFlexGroup style={{ height: '400px' }} alignItems="center" justifyContent="center">
    <EuiLoadingSpinner size="xxl" />
  </EuiFlexGroup>
);

const Error = ({ error }: { error: unknown }) => (
  <EuiCallOut
    color="danger"
    iconType="error"
    title={i18n.translate('xpack.searchHomepage.indicesCard.fetchError.title', {
      defaultMessage: 'Error fetching indices',
    })}
  >
    <EuiText>
      <p>
        {getErrorMessage(
          error,
          i18n.translate('xpack.searchHomepage.indicesCard.fetchError.fallbackMessage', {
            defaultMessage:
              'There was an error fetching indices, check Kibana logs for more information.',
          })
        )}
      </p>
    </EuiText>
  </EuiCallOut>
);
