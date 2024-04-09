/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiText,
  EuiIcon,
  EuiInMemoryTable,
  EuiSearchBarProps,
  type HorizontalAlignment,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import { Query } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { AddMetadataFilterButton } from './add_metadata_filter_button';
import { ExpandableContent } from '../../components/expandable_content';
import { type Field, getRowsWithPins } from './utils';
import { AddMetadataPinToRow } from './add_pin_to_row';

export interface Props {
  rows: Field[];
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

const LOCAL_STORAGE_PINNED_METADATA_ROWS = 'hostsView:pinnedMetadataRows';

export const Table = ({ loading, rows, onSearchChange, search, showActionsColumn }: Props) => {
  const [searchError, setSearchError] = useState<SearchErrorType | null>(null);
  const [metadataSearch, setMetadataSearch] = useState(search);
  const [fieldsWithPins, setFieldsWithPins] = useState(rows);

  const [pinnedItems, setPinnedItems] = useLocalStorage<Array<Field['name']>>(
    LOCAL_STORAGE_PINNED_METADATA_ROWS,
    []
  );

  useMemo(() => {
    if (pinnedItems) {
      setFieldsWithPins(getRowsWithPins(rows, pinnedItems) ?? rows);
    }
  }, [rows, pinnedItems]);

  const defaultColumns = useMemo(
    () => [
      {
        field: 'value',
        name: <EuiIcon type="pin" />,
        align: 'center' as HorizontalAlignment,
        width: '5%',
        sortable: false,
        showOnHover: true,
        render: (_name: string, item: Field) => {
          return (
            <AddMetadataPinToRow
              fieldName={item.name}
              pinnedItems={pinnedItems ?? []}
              onPinned={setPinnedItems}
            />
          );
        },
      },
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
        width: '50%',
        sortable: false,
        render: (_name: string, item: Field) => <ExpandableContent values={item.value} />,
      },
    ],
    [pinnedItems, setPinnedItems]
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
      'data-test-subj': 'infraAssetDetailsMetadataSearchBarInput',
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
              render: (_name: string, item: Field) => {
                return <AddMetadataFilterButton item={item} />;
              },
            },
          ]
        : defaultColumns,
    [defaultColumns, showActionsColumn]
  );

  return (
    <EuiInMemoryTable
      data-test-subj="infraAssetDetailsMetadataTable"
      tableLayout="fixed"
      responsiveBreakpoint={false}
      columns={columns}
      items={fieldsWithPins}
      rowProps={{ className: 'euiTableRow-hasActions' }}
      search={searchBar}
      loading={loading}
      error={searchError ? `${searchError.message}` : ''}
      message={
        loading ? (
          <div data-test-subj="infraAssetDetailsMetadataLoading">{LOADING}</div>
        ) : (
          <div data-test-subj="infraAssetDetailsMetadataNoData">{NO_METADATA_FOUND}</div>
        )
      }
    />
  );
};
