/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiPopoverTitle,
  EuiFilterButton,
  EuiPopover,
  EuiIcon,
  EuiButtonEmpty,
  EuiSelectableOption,
} from '@elastic/eui';

import { EuiSelectable } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FilterProps } from '../columns/filter_expanded';
import { useAppDataViewContext } from '../../hooks/use_app_data_view';
import { FilterValuesList } from './filter_values_list';
import { useFilterValues } from '../use_filter_values';

export function LabelsFieldFilter(props: FilterProps) {
  const { series } = props;

  const [query, setQuery] = useState('');

  const { dataView } = useAppDataViewContext(series.dataType);

  const labelFields = dataView?.fields.filter((field) => field.name.startsWith('labels.'));

  const [isPopoverOpen, setPopover] = useState(false);

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const button = (
    <EuiFilterButton iconType="arrowDown" iconSide="right" onClick={onButtonClick}>
      {LABELS_LABEL}
    </EuiFilterButton>
  );

  const [selectedLabel, setSelectedLabel] = useState('');

  const { values, loading } = useFilterValues({ ...props, field: selectedLabel }, query);

  const labelFieldOptions: EuiSelectableOption[] = (labelFields ?? []).map((field) => {
    return {
      label: field.name,
      searchableLabel: field.name,
      append: <EuiIcon type="arrowRight" />,
      showIcons: false,
    };
  });

  labelFieldOptions.unshift({
    label: LABELS_FIELDS_LABEL,
    isGroupLabel: true,
  });

  const closePopover = () => {
    setPopover(false);
    setSelectedLabel('');
  };

  return (
    <EuiPopover button={button} closePopover={closePopover} isOpen={isPopoverOpen}>
      {selectedLabel ? (
        <>
          <EuiPopoverTitle>
            <EuiButtonEmpty
              iconType="arrowLeft"
              iconSide="left"
              onClick={() => setSelectedLabel('')}
            >
              {BACK_TO_LABEL}
            </EuiButtonEmpty>
          </EuiPopoverTitle>
          <FilterValuesList
            {...props}
            label={selectedLabel}
            values={values}
            query={query}
            setQuery={setQuery}
            loading={loading}
            field={selectedLabel}
          />
        </>
      ) : (
        <EuiSelectable
          searchable
          options={labelFieldOptions}
          onChange={(optionsChange) => {
            const checked = optionsChange.find((option) => option.checked === 'on');
            setSelectedLabel(checked?.label ?? '');
          }}
          listProps={{
            onFocusBadge: false,
          }}
          height={450}
        >
          {(list, search) => (
            <div style={{ width: 400 }}>
              {search}
              {list}
            </div>
          )}
        </EuiSelectable>
      )}
    </EuiPopover>
  );
}

const LABELS_LABEL = i18n.translate('xpack.observability.filters.expanded.labels.label', {
  defaultMessage: 'Labels',
});

const LABELS_FIELDS_LABEL = i18n.translate('xpack.observability.filters.expanded.labels.fields', {
  defaultMessage: 'Label fields',
});

const BACK_TO_LABEL = i18n.translate('xpack.observability.filters.expanded.labels.backTo', {
  defaultMessage: 'Back to labels',
});
