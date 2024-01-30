/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import {
  EuiFormRow,
  EuiComboBox,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiSelect,
  EuiComboBoxOptionOption,
} from '@elastic/eui';

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

export type SLOView = 'cardView' | 'listView';

export function SloGroupConfiguration({ onSelected }) {
  const mapGroupsToOptions = (items) =>
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
  const [sloView, setSloView] = useState('cardView');

  // Fetch the groups for slo.tags, status and slo.indicator.type
  const { data: tags, isLoading: isTagsLoading } = useFetchSloGroups({
    perPage: 100,
    groupBy: 'slo.tags',
  });

  const { data: statuses, isLoading: isStatusesLoading } = useFetchSloGroups({
    perPage: 100,
    groupBy: 'status',
  });

  const { data: sliTypes, isLoading: isSliTypesLoading } = useFetchSloGroups({
    perPage: 100,
    groupBy: 'slo.indicator.type',
  });

  useEffect(() => {
    let isLoadedWithData = false;
    let results;
    if (selectedGroupBy === 'slo.tags') {
      isLoadedWithData = !isTagsLoading && tags?.results !== undefined;
      results = tags?.results;
      setSelectedGroupByLabel('Tags');
    } else if (selectedGroupBy === 'status') {
      isLoadedWithData = !isStatusesLoading && statuses?.results !== undefined;
      results = statuses?.results;
      setSelectedGroupByLabel('Status');
    } else if (selectedGroupBy === 'slo.indicator.type') {
      isLoadedWithData = !isSliTypesLoading && sliTypes?.results !== undefined;
      results = sliTypes?.results;
      setSelectedGroupByLabel('SLI type');
    }

    const opts: Array<EuiComboBoxOptionOption<string>> = isLoadedWithData
      ? mapGroupsToOptions(results)
      : [];
    setGroupOptions(opts);
  }, [
    isSliTypesLoading,
    isStatusesLoading,
    isTagsLoading,
    selectedGroupBy,
    sliTypes?.results,
    statuses?.results,
    tags?.results,
  ]);

  const toggleButtonsIcons = [
    {
      id: `cardView`,
      label: 'Card View',
      iconType: 'visGauge',
      'data-test-subj': 'sloCardViewButton',
    },
    {
      id: `listView`,
      label: 'List View',
      iconType: 'list',
      'data-test-subj': 'sloListViewButton',
    },
  ];

  const onChange = (opts: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedGroupOptions(opts);
    const selectedGroups =
      opts.length >= 1
        ? groupOptions?.filter((group) => opts.find((opt) => opt.value === group.value))
        : undefined;
    onSelected({
      groupBy: selectedGroupBy,
      groups: selectedGroups,
      sloView,
    });
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
            console.log(e.target.value, '!!e.target.value');
            onSelected({
              groups: selectedGroupOptions,
              groupBy: e.target.value,
              sloView,
            });
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

      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText>
            {i18n.translate('xpack.slo.sloGroupConfiguration.viewModeTextLabel', {
              defaultMessage: 'View mode',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            buttonSize="compressed"
            legend={i18n.translate('xpack.slo.toggleSLOView.euiButtonGroup.sloView', {
              defaultMessage: 'SLO View',
            })}
            options={toggleButtonsIcons}
            idSelected={sloView}
            onChange={(id) => {
              setSloView(id as SLOView);
              onSelected({
                groups: selectedGroupOptions,
                groupBy: selectedGroupBy,
                sloView: id,
              });
            }}
            isIconOnly
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
