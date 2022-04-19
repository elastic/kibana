/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import { EuiThemeComputed, useEuiTheme } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-plugin/common';
import * as TEST_SUBJECTS from './test_subjects';
import type { CspFindingsResult } from './use_findings';
import type { FindingsBaseURLQuery } from './types';
import type { CspClientPluginStartDeps } from '../../types';
import { PLUGIN_NAME } from '../../../common';
import { FINDINGS_SEARCH_PLACEHOLDER } from './translations';

type SearchBarQueryProps = Pick<FindingsBaseURLQuery, 'query' | 'filters'>;

interface FindingsSearchBarProps extends SearchBarQueryProps {
  setQuery(v: Partial<SearchBarQueryProps>): void;
  loading: CspFindingsResult['loading'];
}

export const FindingsSearchBar = ({
  dataView,
  query,
  filters,
  loading,
  setQuery,
}: FindingsSearchBarProps & { dataView: DataView }) => {
  const { euiTheme } = useEuiTheme();
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana<CspClientPluginStartDeps>().services;

  return (
    <div css={getContainerStyle(euiTheme)}>
      <SearchBar
        appName={PLUGIN_NAME}
        dataTestSubj={TEST_SUBJECTS.FINDINGS_SEARCH_BAR}
        showFilterBar={true}
        showQueryBar={true}
        showQueryInput={true}
        showDatePicker={false}
        showSaveQuery={false}
        isLoading={loading}
        indexPatterns={[dataView]}
        query={query}
        filters={filters}
        onQuerySubmit={setQuery}
        // @ts-expect-error onFiltersUpdated is a valid prop on SearchBar
        onFiltersUpdated={(value: Filter[]) => setQuery({ filters: value })}
        placeholder={FINDINGS_SEARCH_PLACEHOLDER}
      />
    </div>
  );
};

const getContainerStyle = (theme: EuiThemeComputed) => css`
  border-bottom: ${theme.border.thin};
  background-color: ${theme.colors.body};
  padding: ${theme.size.base};
`;
