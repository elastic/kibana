/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiText,
  EuiInMemoryTable,
  EuiSearchBarProps,
  type HorizontalAlignment,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import { Query } from '@elastic/eui';
import { AddMetadataFilterButton } from './add_metadata_filter_button';
import { ExpandableContent } from '../../components/expandable_content';

interface Row {
  name: string;
  value: string | string[] | undefined;
}

export interface Props {
  rows: Row[];
  loading: boolean;
  showActionsColumn?: boolean;
  search?: string;
  onSearchChange?: (query: string) => void;
}

interface SearchErrorType {
  message: string;
}

/**
 * Columns translations
 */
const FIELD_LABEL = i18n.translate('xpack.infra.metadataEmbeddable.field', {
  defaultMessage: 'Field',
});

const VALUE_LABEL = i18n.translate('xpack.infra.metadataEmbeddable.value', {
  defaultMessage: 'Value',
});

/**
 * Component translations
 */
const SEARCH_PLACEHOLDER = i18n.translate('xpack.infra.metadataEmbeddable.searchForMetadata', {
  defaultMessage: 'Search for metadata…',
});

const NO_METADATA_FOUND = i18n.translate('xpack.infra.metadataEmbeddable.noMetadataFound', {
  defaultMessage: 'No metadata found.',
});

const LOADING = i18n.translate('xpack.infra.metadataEmbeddable.loading', {
  defaultMessage: 'Loading...',
});

export const Table = ({ loading, rows, onSearchChange, search, showActionsColumn }: Props) => {
  const [searchError, setSearchError] = useState<SearchErrorType | null>(null);
  const [metadataSearch, setMetadataSearch] = useState(search);

  const defaultColumns = useMemo(
    () => [
      {
        field: 'name',
        name: FIELD_LABEL,
        width: '35%',
        sortable: false,
        render: (name: string) => <EuiText size="s">{name}</EuiText>,
      },
      {
        field: 'value',
        name: VALUE_LABEL,
        width: '55%',
        sortable: false,
        render: (_name: string, item: Row) => <ExpandableContent values={item.value} />,
      },
    ],
    []
  );

  const debouncedSearchOnChange = useMemo(
    () =>
      debounce<(queryText: string) => void>((queryText) => {
        if (onSearchChange) {
          onSearchChange(queryText);
        }
        setMetadataSearch(queryText);
      }, 500),
    [onSearchChange]
  );

  const searchBarOnChange = useCallback(
    ({ queryText, error }) => {
      if (error) {
        setSearchError(error);
      } else {
        setSearchError(null);
        debouncedSearchOnChange(queryText);
      }
    },
    [debouncedSearchOnChange]
  );

  const searchBar: EuiSearchBarProps = {
    onChange: searchBarOnChange,
    box: {
      'data-test-subj': 'infraHostMetadataSearchBarInput',
      incremental: true,
      schema: true,
      placeholder: SEARCH_PLACEHOLDER,
    },
    query: metadataSearch ? Query.parse(metadataSearch) : Query.MATCH_ALL,
  };

  const columns = useMemo(
    () =>
      showActionsColumn
        ? [
            ...defaultColumns,
            {
              field: 'value',
              name: 'Actions',
              sortable: false,
              showOnHover: true,
              align: 'center' as HorizontalAlignment,
              render: (_name: string, item: Row) => {
                return <AddMetadataFilterButton item={item} />;
              },
            },
          ]
        : defaultColumns,
    [defaultColumns, showActionsColumn]
  );

  return (
    <EuiInMemoryTable
      data-test-subj="infraMetadataTable"
      tableLayout={'fixed'}
      responsive={false}
      columns={columns}
      items={rows}
      rowProps={{ className: 'euiTableRow-hasActions' }}
      search={searchBar}
      loading={loading}
      error={searchError ? `${searchError.message}` : ''}
      message={
        loading ? (
          <div data-test-subj="infraHostMetadataLoading">{LOADING}</div>
        ) : (
          <div data-test-subj="infraHostMetadataNoData">{NO_METADATA_FOUND}</div>
        )
      }
    />
  );
};
