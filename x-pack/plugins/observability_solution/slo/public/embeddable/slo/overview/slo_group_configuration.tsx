/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import { EuiFormRow, EuiComboBox, EuiSelect, EuiComboBoxOptionOption } from '@elastic/eui';
import { SLOGroupWithSummaryResponse } from '@kbn/slo-schema';

import { i18n } from '@kbn/i18n';
import { useFetchSloGroups } from '../../../hooks/use_fetch_slo_groups';

interface Option {
  value: string;
  text: string;
}

const groupByOptions: Option[] = [
  {
    text: i18n.translate('xpack.slo.list.groupBy.tags', {
      defaultMessage: 'by Tag',
    }),
    value: 'slo.tags',
  },
  {
    text: i18n.translate('xpack.slo.list.groupBy.tags', {
      defaultMessage: 'by Status',
    }),
    value: 'status',
  },
  {
    text: i18n.translate('xpack.slo.list.groupBy.sliType', {
      defaultMessage: 'by SLI type',
    }),
    value: 'slo.indicator.type',
  },
];

interface Props {
  onSelected: (prop: string, value: string | SLOGroupWithSummaryResponse[] | undefined) => void;
}

export function SloGroupConfiguration({ onSelected }: Props) {
  const mapGroupsToOptions = (items: SLOGroupWithSummaryResponse[] | undefined) =>
    items?.map((item) => ({
      label: item.group,
      value: item.group,
    })) ?? [];
  const [selectedGroupBy, setSelectedGroupBy] = useState('slo.tags');
  const [selectedGroupByLabel, setSelectedGroupByLabel] = useState('Tag');
  const [groupOptions, setGroupOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [selectedGroupOptions, setSelectedGroupOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);

  const { data, isLoading } = useFetchSloGroups({
    perPage: 100,
    groupBy: selectedGroupBy,
  });

  useEffect(() => {
    const isLoadedWithData = !isLoading && data?.results !== undefined;
    const opts: Array<EuiComboBoxOptionOption<string>> = isLoadedWithData
      ? mapGroupsToOptions(data?.results)
      : [];
    setGroupOptions(opts);
    if (selectedGroupBy === 'slo.tags') {
      setSelectedGroupByLabel('Tags');
    } else if (selectedGroupBy === 'status') {
      setSelectedGroupByLabel('Status');
    } else if (selectedGroupBy === 'slo.indicator.type') {
      setSelectedGroupByLabel('SLI type');
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
          }}
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.slo.sloGroupConfiguration.groupTypeLabel', {
          defaultMessage: '{ selectedGroupByLabel }',
          values: { selectedGroupByLabel },
        })}
      >
        <EuiComboBox
          aria-label={i18n.translate('xpack.slo.sloEmbeddable.config.sloSelector.ariaLabel', {
            defaultMessage: '{ selectedGroupByLabel }',
            values: { selectedGroupByLabel },
          })}
          placeholder={i18n.translate('xpack.slo.sloEmbeddable.config.sloSelector.placeholder', {
            defaultMessage: 'Select a {selectedGroupByLabel}',
            values: { selectedGroupByLabel },
          })}
          data-test-subj="sloGroup"
          options={groupOptions}
          selectedOptions={selectedGroupOptions}
          async
          onChange={onChange}
          fullWidth
          singleSelection={false}
        />
      </EuiFormRow>
    </>
  );
}
