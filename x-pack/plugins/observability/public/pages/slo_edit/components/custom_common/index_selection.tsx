/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import React, { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useFetchDataViews } from '../../../../hooks/use_fetch_data_views';
import { useFetchIndices } from '../../../../hooks/use_fetch_indices';
import { CreateSLOForm } from '../../types';

interface Option {
  label: string;
  options: Array<{ value: string; label: string }>;
}

export function IndexSelection() {
  const { control, getFieldState } = useFormContext<CreateSLOForm>();
  const [searchValue, setSearchValue] = useState<string>('');

  const { isLoading: isIndicesLoading, data: indices = [] } = useFetchIndices({
    search: searchValue,
  });
  const { isLoading: isDataViewsLoading, data: dataViews = [] } = useFetchDataViews({
    name: searchValue,
  });

  const options: Option[] = [];
  if (!isDataViewsLoading && dataViews.length > 0) {
    options.push(createDataViewsOption(dataViews));
  }
  if (!isIndicesLoading && !!searchValue) {
    options.push(createIndexPatternOption(searchValue, indices));
  }

  const onSearchChange = debounce((value: string) => setSearchValue(value), 300);

  const placeholder = i18n.translate('xpack.observability.slo.sloEdit.indexSelection.placeholder', {
    defaultMessage: 'Select an index pattern',
  });

  return (
    <EuiFormRow
      label={i18n.translate('xpack.observability.slo.sloEdit.customKql.indexSelection.label', {
        defaultMessage: 'Index',
      })}
      helpText={i18n.translate(
        'xpack.observability.slo.sloEdit.customKql.indexSelection.helpText',
        { defaultMessage: 'Use * to broaden your query.' }
      )}
      isInvalid={getFieldState('indicator.params.index').invalid}
    >
      <Controller
        defaultValue=""
        name="indicator.params.index"
        control={control}
        rules={{ required: true }}
        render={({ field, fieldState }) => (
          <EuiComboBox
            {...field}
            aria-label={placeholder}
            async
            data-test-subj="indexSelection"
            isClearable
            isInvalid={fieldState.invalid}
            isLoading={isIndicesLoading && isDataViewsLoading}
            placeholder={placeholder}
            onChange={(selected: EuiComboBoxOptionOption[]) => {
              if (selected.length) {
                return field.onChange(selected[0].value);
              }

              field.onChange('');
            }}
            options={options}
            onSearchChange={onSearchChange}
            selectedOptions={
              !!field.value
                ? [
                    {
                      value: field.value,
                      label: field.value,
                      'data-test-subj': 'indexSelectionSelectedValue',
                    },
                  ]
                : []
            }
            singleSelection
          />
        )}
      />
    </EuiFormRow>
  );
}

function createDataViewLabel(dataView: DataView) {
  return `${dataView.getName()} (${dataView.getIndexPattern()})`;
}

function createDataViewsOption(dataViews: DataView[]): Option {
  return {
    label: i18n.translate('xpack.observability.slo.sloEdit.indexSelection.dataViewOptionsLabel', {
      defaultMessage: 'Select an index pattern from an existing Data View',
    }),
    options: dataViews
      .map((view) => ({
        label: createDataViewLabel(view),
        value: view.getIndexPattern(),
      }))
      .sort((a, b) => String(a.label).localeCompare(b.label)),
  };
}

function createIndexPatternOption(searchValue: string, indices: string[]): Option {
  const indexPattern = searchValue.endsWith('*') ? searchValue : `${searchValue}*`;
  const hasMatchingIndices = indices.length > 0;

  return {
    label: i18n.translate(
      'xpack.observability.slo.sloEdit.customKql.indexSelection.indexPatternLabel',
      { defaultMessage: 'Use the index pattern' }
    ),
    options: [
      {
        value: indexPattern,
        label: hasMatchingIndices
          ? i18n.translate(
              'xpack.observability.slo.sloEdit.customKql.indexSelection.indexPatternFoundLabel',
              {
                defaultMessage:
                  '{searchPattern} (match {num, plural, one {# index} other {# indices}})',
                values: { searchPattern: indexPattern, num: indices.length },
              }
            )
          : i18n.translate(
              'xpack.observability.slo.sloEdit.indexSelection.indexPatternNoMatchLabel',
              { defaultMessage: '{searchPattern}', values: { searchPattern: indexPattern } }
            ),
      },
    ],
  };
}
