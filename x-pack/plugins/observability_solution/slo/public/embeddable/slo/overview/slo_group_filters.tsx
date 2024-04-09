/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import './slo_group_filters.scss';
import React, { useState } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
// import { SearchBar } from '@kbn/unified-search-plugin/public';
import { useKibana } from '../../../utils/kibana_react';
import { useCreateDataView } from '../../../hooks/use_create_data_view';
import { SLO_SUMMARY_DESTINATION_INDEX_NAME } from '../../../../common/constants';
import { sloAppId } from '../../../../common';
import type { GroupFilters, GroupBy } from './types';
interface Option {
  value: string;
  text: string;
}

export const groupByOptions: Option[] = [
  {
    text: i18n.translate('xpack.slo.sloGroupConfiguration.groupBy.tags', {
      defaultMessage: 'Tags',
    }),
    value: 'slo.tags',
  },
  {
    text: i18n.translate('xpack.slo.sloGroupConfiguration.groupBy.status', {
      defaultMessage: 'Status',
    }),
    value: 'status',
  },
  {
    text: i18n.translate('xpack.slo.sloGroupConfiguration.groupBy.sliType', {
      defaultMessage: 'SLI type',
    }),
    value: 'slo.indicator.type',
  },
];

interface Props {
  onSelected: (prop: string, value: any | undefined) => void;
  selectedFilters: GroupFilters; // TODO fix type
}

export function SloGroupFilters({ selectedFilters, onSelected }: Props) {
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;
  const { dataView } = useCreateDataView({
    indexPatternString: SLO_SUMMARY_DESTINATION_INDEX_NAME,
  });
  const [selectedGroupBy, setSelectedGroupBy] =
    useState<GroupBy>(selectedFilters.groupBy) ?? 'status';
  const [filters, setFilters] = useState(selectedFilters.filters) ?? [];
  const [kqlQuery, setkqlQuery] = useState(selectedFilters.kqlQuery);

  return (
    <>
      <SearchBar
        appName={sloAppId}
        placeholder={PLACEHOLDER}
        indexPatterns={dataView ? [dataView] : []}
        showSubmitButton={false}
        showFilterBar={true}
        filters={filters}
        onFiltersUpdated={(newFilters) => {
          setFilters(newFilters);
          onSelected('filters', newFilters);
        }}
        onQuerySubmit={({ query: value }) => {
          setkqlQuery(String(value?.query));
          onSelected('kqlQuery', String(value?.query));
        }}
        onQueryChange={({ query: value }) => {
          setkqlQuery(String(value?.query));
          onSelected('kqlQuery', String(value?.query));
        }}
        query={{ query: String(kqlQuery), language: 'kuery' }}
        showDatePicker={false}
        disableQueryLanguageSwitcher={true}
        saveQueryMenuVisibility="globally_managed"
        onClearSavedQuery={() => {}}
        showQueryInput={true}
        onSavedQueryUpdated={(savedQuery) => {
          setFilters(savedQuery.attributes.filters);
          setkqlQuery(String(savedQuery.attributes.query.query));
        }}
      />

      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.slo.sloGroupConfiguration.groupTypeLabel', {
          defaultMessage: 'Group by',
        })}
      >
        <EuiSelect
          fullWidth
          data-test-subj="o11ySloGroupConfigurationSelect"
          options={groupByOptions}
          value={selectedGroupBy}
          onChange={(e) => {
            setSelectedGroupBy(e.target.value as GroupBy);
            onSelected('groupBy', e.target.value);
          }}
        />
      </EuiFormRow>
    </>
  );
}

const PLACEHOLDER = i18n.translate('xpack.slo.list.search', {
  defaultMessage: 'Search your SLOs ...',
});
