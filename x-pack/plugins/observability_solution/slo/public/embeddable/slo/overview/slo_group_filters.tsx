/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { debounce } from 'lodash';
import { EuiFormRow, EuiComboBox, EuiSelect, EuiComboBoxOptionOption } from '@elastic/eui';
import { SLOGroupWithSummaryResponse } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';
import { useFetchSloGroups } from '../../../hooks/use_fetch_slo_groups';
import { SLI_OPTIONS } from '../../../pages/slo_edit/constants';
interface Option {
  value: string;
  text: string;
}

const groupByOptions: Option[] = [
  {
    text: i18n.translate('xpack.slo.sloGroupConfiguration.groupBy.tags', {
      defaultMessage: 'by Tag',
    }),
    value: 'slo.tags',
  },
  {
    text: i18n.translate('xpack.slo.sloGroupConfiguration.groupBy.status', {
      defaultMessage: 'by Status',
    }),
    value: 'status',
  },
  {
    text: i18n.translate('xpack.slo.sloGroupConfiguration.groupBy.sliType', {
      defaultMessage: 'by SLI type',
    }),
    value: 'slo.indicator.type',
  },
];

interface Props {
  onSelected: (prop: string, value: string | SLOGroupWithSummaryResponse[] | undefined) => void;
}

export function SloGroupFilters({ onSelected }: Props) {
  const mapGroupsToOptions = (items: SLOGroupWithSummaryResponse[] | undefined) =>
    items?.map((item) => {
      let label = item.group;
      if (item.groupBy === 'status') {
        label = item.group.toLowerCase();
      } else if (item.groupBy === 'slo.indicator.type') {
        label = SLI_OPTIONS.find((option) => option.value === item.group)!.text ?? item.group;
      }
      return {
        label,
        value: item.group,
      };
    }) ?? [];
  const [selectedGroupBy, setSelectedGroupBy] = useState('slo.tags');
  const [selectedGroupByLabel, setSelectedGroupByLabel] = useState('Tag');
  const [groupOptions, setGroupOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [selectedGroupOptions, setSelectedGroupOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
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
      ? mapGroupsToOptions(data?.results)
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
    const selectedGroups =
      opts.length >= 1
        ? data!.results?.filter((group) => opts.find((opt) => opt.value === group.group))
        : undefined;
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
          defaultMessage: 'Group type',
        })}
      >
        <EuiSelect
          fullWidth
          data-test-subj="o11ySloGroupConfigurationSelect"
          options={groupByOptions}
          value={selectedGroupBy}
          onChange={(e) => {
            setSelectedGroupBy(e.target.value);
            onSelected('groupBy', e.target.value);
            setSelectedGroupOptions([]);
          }}
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.slo.sloGroupConfiguration.groupByLabel', {
          defaultMessage: '{ selectedGroupByLabel }',
          values: { selectedGroupByLabel },
        })}
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
    </>
  );
}
