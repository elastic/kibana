/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext } from 'react';
import { css } from '@emotion/react';
import { EuiThemeComputed, useEuiTheme } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import { SecuritySolutionContext } from '../../../application/security_solution_context';
import type { FindingsBaseURLQuery } from '../types';
import type { CspClientPluginStartDeps } from '../../../types';
import { PLUGIN_NAME } from '../../../../common';

type SearchBarQueryProps = Pick<FindingsBaseURLQuery, 'query' | 'filters'>;

interface FindingsSearchBarProps {
  setQuery(v: Partial<SearchBarQueryProps>): void;
  loading: boolean;
}

export const FindingsSearchBar = ({
  dataView,
  loading,
  setQuery,
}: FindingsSearchBarProps & { dataView: DataView }) => {
  const { euiTheme } = useEuiTheme();
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana<CspClientPluginStartDeps>().services;

  const securitySolutionContext = useContext(SecuritySolutionContext);

  let searchBarNode = (
    <div css={getContainerStyle(euiTheme)}>
      <SearchBar
        appName={PLUGIN_NAME}
        showFilterBar={true}
        showQueryInput={true}
        showDatePicker={false}
        showSaveQuery={false}
        isLoading={loading}
        indexPatterns={[dataView]}
        onQuerySubmit={setQuery}
        onFiltersUpdated={(value: Filter[]) => setQuery({ filters: value })}
        placeholder={i18n.translate('xpack.csp.findings.searchBar.searchPlaceholder', {
          defaultMessage: 'Search findings (eg. rule.section : "API Server" )',
        })}
      />
    </div>
  );

  if (securitySolutionContext) {
    const FiltersGlobal = securitySolutionContext.getFiltersGlobalComponent();
    searchBarNode = <FiltersGlobal>{searchBarNode}</FiltersGlobal>;
  }

  return <>{searchBarNode}</>;
};

const getContainerStyle = (theme: EuiThemeComputed) => css`
  border-bottom: ${theme.border.thin};
  background-color: ${theme.colors.body};
  padding: ${theme.size.base};
`;
