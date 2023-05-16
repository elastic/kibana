/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiInMemoryTable,
  EuiSearchBarProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import useToggle from 'react-use/lib/useToggle';
import { debounce } from 'lodash';
import { Query } from '@elastic/eui';
import { useHostFlyoutOpen } from '../../../hooks/use_host_flyout_open_url_state';
import { AddMetadataFilterButton } from './add_metadata_filter_button';

interface Row {
  name: string;
  value: string | string[] | undefined;
}

export interface Props {
  rows: Row[];
  loading: boolean;
}

interface SearchErrorType {
  message: string;
}

/**
 * Columns translations
 */
const FIELD_LABEL = i18n.translate('xpack.infra.hostsViewPage.hostDetail.metadata.field', {
  defaultMessage: 'Field',
});

const VALUE_LABEL = i18n.translate('xpack.infra.hostsViewPage.hostDetail.metadata.value', {
  defaultMessage: 'Value',
});

/**
 * Component translations
 */
const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.infra.hostsViewPage.hostDetail.metadata.searchForMetadata',
  {
    defaultMessage: 'Search for metadata…',
  }
);

const NO_METADATA_FOUND = i18n.translate(
  'xpack.infra.hostsViewPage.hostDetail.metadata.noMetadataFound',
  {
    defaultMessage: 'No metadata found.',
  }
);

const LOADING = i18n.translate('xpack.infra.hostsViewPage.hostDetail.metadata.loading', {
  defaultMessage: 'Loading...',
});

export const Table = (props: Props) => {
  const { rows, loading } = props;
  const [searchError, setSearchError] = useState<SearchErrorType | null>(null);
  const [hostFlyoutOpen, setHostFlyoutOpen] = useHostFlyoutOpen();

  const debouncedSearchOnChange = useMemo(
    () =>
      debounce<(queryText: string) => void>((queryText) => {
        setHostFlyoutOpen({ metadataSearch: String(queryText) ?? '' });
      }, 500),
    [setHostFlyoutOpen]
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

  const search: EuiSearchBarProps = {
    onChange: searchBarOnChange,
    box: {
      'data-test-subj': 'infraHostMetadataSearchBarInput',
      incremental: true,
      schema: true,
      placeholder: SEARCH_PLACEHOLDER,
    },
    query: hostFlyoutOpen.metadataSearch
      ? Query.parse(hostFlyoutOpen.metadataSearch)
      : Query.MATCH_ALL,
  };

  const columns = useMemo(
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
      {
        field: 'value',
        name: 'Actions',
        sortable: false,
        showOnHover: true,
        render: (_name: string, item: Row) => {
          return <AddMetadataFilterButton item={item} />;
        },
      },
    ],
    []
  );

  return (
    <EuiInMemoryTable
      data-test-subj="infraMetadataTable"
      tableLayout={'fixed'}
      responsive={false}
      columns={columns}
      items={rows}
      rowProps={{ className: 'euiTableRow-hasActions' }}
      search={search}
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

interface ExpandableContentProps {
  values: string | string[] | undefined;
}
const ExpandableContent = (props: ExpandableContentProps) => {
  const { values } = props;
  const [isExpanded, toggle] = useToggle(false);

  const list = Array.isArray(values) ? values : [values];
  const [first, ...others] = list;
  const hasOthers = others.length > 0;
  const shouldShowMore = hasOthers && !isExpanded;

  return (
    <EuiFlexGroup
      gutterSize={'xs'}
      responsive={false}
      alignItems={'baseline'}
      wrap={true}
      direction="column"
    >
      <div>
        {first}
        {shouldShowMore && (
          <>
            {' ... '}
            <EuiLink data-test-subj="infraExpandableContentCountMoreLink" onClick={toggle}>
              <FormattedMessage
                id="xpack.infra.nodeDetails.tabs.metadata.seeMore"
                defaultMessage="+{count} more"
                values={{
                  count: others.length,
                }}
              />
            </EuiLink>
          </>
        )}
      </div>
      {isExpanded && others.map((item) => <EuiFlexItem key={item}>{item}</EuiFlexItem>)}
      {hasOthers && isExpanded && (
        <EuiFlexItem>
          <EuiLink data-test-subj="infraExpandableContentShowLessLink" onClick={toggle}>
            {i18n.translate('xpack.infra.nodeDetails.tabs.metadata.seeLess', {
              defaultMessage: 'Show less',
            })}
          </EuiLink>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
