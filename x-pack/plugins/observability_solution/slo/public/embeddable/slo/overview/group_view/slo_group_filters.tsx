/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import './slo_group_filters.scss';
import React, { useState, useEffect, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { Filter } from '@kbn/es-query';
import { debounce } from 'lodash';
import { EuiFormRow, EuiComboBox, EuiSelect, EuiComboBoxOptionOption, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useFetchSloGroups } from '../../../../hooks/use_fetch_slo_groups';
import { SLI_OPTIONS } from '../../../../pages/slo_edit/constants';
import { useKibana } from '../../../../utils/kibana_react';
import { useCreateDataView } from '../../../../hooks/use_create_data_view';
import { SLO_SUMMARY_DESTINATION_INDEX_NAME } from '../../../../../common/constants';
import { sloAppId } from '../../../../../common';
import type { GroupFilters, GroupBy } from '../types';
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
  onSelected: (prop: string, value: string | Array<string | undefined> | Filter[]) => void;
  selectedFilters: GroupFilters;
}

const mapGroupsToOptions = (groups: string[] | undefined, selectedGroupBy: string) =>
  groups?.map((group) => {
    let label = group;
    if (selectedGroupBy === 'status') {
      label = group.toLowerCase();
    } else if (selectedGroupBy === 'slo.indicator.type') {
      label = SLI_OPTIONS.find((option) => option.value === group)!.text ?? group;
    }
    return {
      label,
      value: group,
    };
  }) ?? [];

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
  const [selectedGroupByLabel, setSelectedGroupByLabel] = useState('Status');
  const [groupOptions, setGroupOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [selectedGroupOptions, setSelectedGroupOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >(mapGroupsToOptions(selectedFilters.groups, selectedGroupBy));
  const [searchValue, setSearchValue] = useState<string>('');
  const sliTypeSearch = SLI_OPTIONS.find((option) =>
    option.text.toLowerCase().includes(searchValue.toLowerCase())
  )?.value;
  const query = `${searchValue}*`;

  const { data, isLoading } = useFetchSloGroups({
    perPage: 100,
    groupBy: selectedGroupBy,
    kqlQuery: `slo.tags: (${query}) or status: (${query.toUpperCase()}) or slo.indicator.type: (${sliTypeSearch})`,
  });

  useEffect(() => {
    const isLoadedWithData = !isLoading && data?.results !== undefined;
    const opts: Array<EuiComboBoxOptionOption<string>> = isLoadedWithData
      ? mapGroupsToOptions(
          data?.results.map((item) => item.group),
          selectedGroupBy
        )
      : [];
    setGroupOptions(opts);

    if (selectedGroupBy === 'slo.tags') {
      setSelectedGroupByLabel(
        i18n.translate('xpack.slo.sloGroupConfiguration.tagsLabel', {
          defaultMessage: 'Tags',
        })
      );
    } else if (selectedGroupBy === 'status') {
      setSelectedGroupByLabel(
        i18n.translate('xpack.slo.sloGroupConfiguration.statusLabel', {
          defaultMessage: 'Status',
        })
      );
    } else if (selectedGroupBy === 'slo.indicator.type') {
      setSelectedGroupByLabel(
        i18n.translate('xpack.slo.sloGroupConfiguration.sliTypeLabel', {
          defaultMessage: 'SLI type',
        })
      );
    }
  }, [isLoading, data, selectedGroupBy]);

  const onChange = (opts: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedGroupOptions(opts);
    const selectedGroups = opts.length >= 1 ? opts.map((opt) => opt.value) : [];
    onSelected('groups', selectedGroups);
  };

  const onSearchChange = useMemo(
    () =>
      debounce((value: string) => {
        setSearchValue(value);
      }, 300),
    []
  );

  return (
    <>
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
            setSelectedGroupOptions([]);
            onSelected('groups', []);
          }}
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.slo.sloGroupConfiguration.groupByLabel', {
          defaultMessage: '{ selectedGroupByLabel }',
          values: { selectedGroupByLabel },
        })}
        labelAppend={
          <EuiText color="subdued" size="xs">
            <FormattedMessage
              id="xpack.slo.sloGroupConfiguration.groupsOptional"
              defaultMessage="Optional"
            />
          </EuiText>
        }
      >
        <EuiComboBox
          aria-label={i18n.translate('xpack.slo.sloGroupConfiguration.sloSelector.ariaLabel', {
            defaultMessage: '{ selectedGroupByLabel }',
            values: { selectedGroupByLabel },
          })}
          placeholder={i18n.translate('xpack.slo.sloGroupConfiguration.sloSelector.placeholder', {
            defaultMessage: 'Select a {selectedGroupByLabel}',
            values: { selectedGroupByLabel },
          })}
          data-test-subj="sloGroup"
          options={groupOptions}
          selectedOptions={selectedGroupOptions}
          async
          onChange={onChange}
          onSearchChange={onSearchChange}
          fullWidth
          singleSelection={false}
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.slo.sloGroupConfiguration.customFiltersLabel', {
          defaultMessage: 'Custom filter',
        })}
        labelAppend={
          <EuiText color="subdued" size="xs">
            <FormattedMessage
              id="xpack.slo.sloGroupConfiguration.customFiltersOptional"
              defaultMessage="Optional"
            />
          </EuiText>
        }
      >
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
      </EuiFormRow>
    </>
  );
}

const PLACEHOLDER = i18n.translate('xpack.slo.sloGroupConfiguration.customFilterText', {
  defaultMessage: 'Custom filter',
});
