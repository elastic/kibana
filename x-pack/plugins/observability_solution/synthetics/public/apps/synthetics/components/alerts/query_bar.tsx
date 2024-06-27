/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Query, Filter } from '@kbn/es-query';
import { EuiFormRow } from '@elastic/eui';
import styled from 'styled-components';
import { useSyntheticsDataView } from '../../contexts/synthetics_data_view_context';
import { ClientPluginsStart } from '../../../../plugin';

export function AlertSearchBar({
  filters,
  kqlQuery,
  onChange,
}: {
  filters: Filter[];
  kqlQuery: string;
  onChange: (val: { kqlQuery?: string; filters?: Filter[] }) => void;
}) {
  const {
    data: { query },
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana<ClientPluginsStart>().services;

  const dataView = useSyntheticsDataView();

  useEffect(() => {
    const sub = query.state$.subscribe(() => {
      const queryState = query.getState();
      onChange({
        kqlQuery: String((queryState.query as Query).query),
        filters: queryState.filters,
      });
    });

    return () => sub.unsubscribe();
  }, [onChange, query]);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.synthetics.list.search.title', {
        defaultMessage: 'Filter by',
      })}
      fullWidth
    >
      <Container>
        <SearchBar
          appName="synthetics"
          placeholder={PLACEHOLDER}
          indexPatterns={dataView ? [dataView] : []}
          filters={filters}
          onFiltersUpdated={(newFilters) => {
            onChange({ filters: newFilters, kqlQuery });
          }}
          onQuerySubmit={({ query: value }) => {
            onChange({ filters, kqlQuery });
          }}
          query={{ query: String(kqlQuery), language: 'kuery' }}
          showSubmitButton={false}
          showDatePicker={false}
          showQueryInput={true}
          disableQueryLanguageSwitcher={true}
          saveQueryMenuVisibility="globally_managed"
          onClearSavedQuery={() => {}}
          onSavedQueryUpdated={(savedQuery) => {
            onChange({
              filters: savedQuery.attributes.filters,
              kqlQuery: String(savedQuery.attributes.query.query),
            });
          }}
        />
      </Container>
    </EuiFormRow>
  );
}

const Container = styled.div`
  .uniSearchBar {
    padding: 0;
  }
`;

const PLACEHOLDER = i18n.translate('xpack.synthetics.list.search', {
  defaultMessage: 'Filter by KQL query',
});
