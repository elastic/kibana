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
import React, { useEffect, useMemo, useState } from 'react';
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
  const [dataViewOptions, setDataViewOptions] = useState<Option[]>([]);
  const [indexPatternOption, setIndexPatternOption] = useState<Option | undefined>();

  const { isLoading: isIndicesLoading, data: indices = [] } = useFetchIndices({
    search: searchValue,
  });
  const { isLoading: isDataViewsLoading, data: dataViews = [] } = useFetchDataViews({
    name: searchValue,
  });

  useEffect(() => {
    if (dataViews.length > 0) {
      setDataViewOptions(createDataViewOptions(dataViews));
    }
  }, [dataViews]);

  useEffect(() => {
    if (indices.length === 0) {
      setIndexPatternOption(undefined);
    } else if (!!searchValue) {
      const searchPattern = searchValue.endsWith('*') ? searchValue : `${searchValue}*`;

      setIndexPatternOption({
        label: i18n.translate(
          'xpack.observability.slo.sloEdit.customKql.indexSelection.indexPatternLabel',
          { defaultMessage: 'Use the index pattern' }
        ),
        options: [
          {
            value: searchPattern,
            label: i18n.translate(
              'xpack.observability.slo.sloEdit.customKql.indexSelection.indexPatternFoundLabel',
              {
                defaultMessage:
                  '{searchPattern} (match {num, plural, one {# index} other {# indices}})',
                values: {
                  searchPattern,
                  num: indices.length,
                },
              }
            ),
          },
        ],
      });
    }
  }, [indices.length, searchValue]);

  const onDataViewSearchChange = useMemo(
    () => debounce((value: string) => setSearchValue(value), 300),
    []
  );

  const placeholder = i18n.translate(
    'xpack.observability.slo.sloEdit.customKql.indexSelection.placeholder',
    {
      defaultMessage: 'Select a Data View or use an index pattern',
    }
  );

  return (
    <EuiFormRow
      label={i18n.translate('xpack.observability.slo.sloEdit.customKql.indexSelection.label', {
        defaultMessage: 'Index',
      })}
      helpText={i18n.translate(
        'xpack.observability.slo.sloEdit.customKql.indexSelection.helpText',
        {
          defaultMessage: 'Use * to broaden your query.',
        }
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
            onChange={(selected: EuiComboBoxOptionOption[]) => {
              if (selected.length) {
                return field.onChange(selected[0].value);
              }

              field.onChange('');
            }}
            onSearchChange={onDataViewSearchChange}
            options={
              indexPatternOption ? [...dataViewOptions, indexPatternOption] : dataViewOptions
            }
            placeholder={placeholder}
            selectedOptions={
              !!field.value ? [findSelectedIndexPattern(dataViews, field.value)] : []
            }
            singleSelection
          />
        )}
      />
    </EuiFormRow>
  );
}

function findSelectedIndexPattern(dataViews: DataView[], indexPattern: string) {
  const selectedDataView = dataViews.find((view) => view.getIndexPattern() === indexPattern);
  if (selectedDataView) {
    return {
      value: selectedDataView.getIndexPattern(),
      label: createDataViewLabel(selectedDataView),
      'data-test-subj': 'indexSelectionSelectedValue',
    };
  }

  return {
    value: indexPattern,
    label: indexPattern,
    'data-test-subj': 'indexSelectionSelectedValue',
  };
}

function createDataViewLabel(dataView: DataView) {
  return `${dataView.getName()} (${dataView.getIndexPattern()})`;
}

function createDataViewOptions(dataViews: DataView[]): Option[] {
  const options = [];

  options.push({
    label: i18n.translate(
      'xpack.observability.slo.sloEdit.customKql.indexSelection.dataViewOptionsLabel',
      { defaultMessage: 'Select an existing Data View' }
    ),
    options: dataViews
      .map((view) => ({
        label: createDataViewLabel(view),
        value: view.getIndexPattern(),
      }))
      .sort((a, b) => String(a.label).localeCompare(b.label)),
  });

  return options;
}
