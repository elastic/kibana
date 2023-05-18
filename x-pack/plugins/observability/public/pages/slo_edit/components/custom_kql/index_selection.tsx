/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CreateSLOInput } from '@kbn/slo-schema';
import { DataView } from '@kbn/data-views-plugin/public';

import { useFetchDataViews } from '../../../../hooks/use_fetch_data_views';
import { useFetchIndices, Index } from '../../../../hooks/use_fetch_indices';

interface Option {
  label: string;
  options: Array<{ value: string; label: string }>;
}

export function IndexSelection() {
  const { control, getFieldState } = useFormContext<CreateSLOInput>();
  const { isLoading: isIndicesLoading, indices = [] } = useFetchIndices();
  const { isLoading: isDataViewsLoading, dataViews = [] } = useFetchDataViews();
  const [indexOptions, setIndexOptions] = useState<Option[]>([]);

  useEffect(() => {
    setIndexOptions(createIndexOptions(indices, dataViews));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indices.length, dataViews.length]);

  const onSearchChange = (search: string) => {
    const options: Option[] = [];
    if (!search) {
      return setIndexOptions(createIndexOptions(indices, dataViews));
    }

    const searchPattern = search.endsWith('*') ? search.substring(0, search.length - 1) : search;
    const matchingIndices = indices.filter(({ name }) => name.startsWith(searchPattern));
    const matchingDataViews = dataViews.filter(
      (view) =>
        view.getName().startsWith(searchPattern) || view.getIndexPattern().startsWith(searchPattern)
    );

    if (matchingIndices.length === 0 && matchingDataViews.length === 0) {
      return setIndexOptions([]);
    }

    createIndexOptions(matchingIndices, matchingDataViews).map((option) => options.push(option));

    const searchWithStarSuffix = search.endsWith('*') ? search : `${search}*`;
    options.push({
      label: i18n.translate(
        'xpack.observability.slo.sloEdit.customKql.indexSelection.indexPatternLabel',
        { defaultMessage: 'Use an index pattern' }
      ),
      options: [{ value: searchWithStarSuffix, label: searchWithStarSuffix }],
    });

    setIndexOptions(options);
  };

  const placeholder = i18n.translate(
    'xpack.observability.slo.sloEdit.customKql.indexSelection.placeholder',
    {
      defaultMessage: 'Select an index or index pattern',
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
        shouldUnregister
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
            onSearchChange={onSearchChange}
            options={indexOptions}
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

function createIndexOptions(indices: Index[], dataViews: DataView[]): Option[] {
  const options = [
    {
      label: i18n.translate(
        'xpack.observability.slo.sloEdit.customKql.indexSelection.indexOptionsLabel',
        { defaultMessage: 'Select an existing index' }
      ),
      options: indices
        .filter(({ name }) => !name.startsWith('.'))
        .map(({ name }) => ({ label: name, value: name }))
        .sort((a, b) => String(a.label).localeCompare(b.label)),
    },
  ];
  if (dataViews.length > 0) {
    options.unshift({
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
  }
  return options;
}
