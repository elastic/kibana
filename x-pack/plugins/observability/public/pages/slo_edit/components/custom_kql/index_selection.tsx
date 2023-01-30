/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { Control, Controller } from 'react-hook-form';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CreateSLOInput } from '@kbn/slo-schema';

import { useFetchIndices, Index } from '../../../../hooks/use_fetch_indices';

export interface Props {
  control: Control<CreateSLOInput>;
}

interface Option {
  label: string;
  options: Array<{ value: string; label: string }>;
}

export function IndexSelection({ control }: Props) {
  const { loading, indices = [] } = useFetchIndices();
  const [indexOptions, setIndexOptions] = useState<Option[]>([]);

  useEffect(() => {
    setIndexOptions([createIndexOptions(indices)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indices.length]);

  const onSearchChange = (search: string) => {
    const options: Option[] = [];
    if (!search) {
      return setIndexOptions([createIndexOptions(indices)]);
    }

    const searchPattern = search.endsWith('*') ? search.substring(0, search.length - 1) : search;
    const matchingIndices = indices.filter(({ name }) => name.startsWith(searchPattern));

    if (matchingIndices.length === 0) {
      return setIndexOptions([]);
    }

    options.push(createIndexOptions(matchingIndices));

    const searchWithStarSuffix = search.endsWith('*') ? search : `${search}*`;
    options.push({
      label: i18n.translate(
        'xpack.observability.slos.sloEdit.customKql.indexSelection.indexPatternLabel',
        { defaultMessage: 'Use an index pattern' }
      ),
      options: [{ value: searchWithStarSuffix, label: searchWithStarSuffix }],
    });

    setIndexOptions(options);
  };

  return (
    <EuiFormRow
      label={i18n.translate('xpack.observability.slos.sloEdit.customKql.indexSelection.label', {
        defaultMessage: 'Index',
      })}
      helpText={i18n.translate(
        'xpack.observability.slos.sloEdit.customKql.indexSelection.helpText',
        {
          defaultMessage: 'Use * to broaden your query.',
        }
      )}
    >
      <Controller
        name="indicator.params.index"
        control={control}
        rules={{ required: true }}
        render={({ field, fieldState }) => (
          <EuiComboBox
            {...field}
            aria-label={i18n.translate(
              'xpack.observability.slos.sloEdit.customKql.indexSelection.placeholder',
              {
                defaultMessage: 'Select an index or index pattern',
              }
            )}
            async
            data-test-subj="indexSelection"
            isClearable={true}
            isInvalid={!!fieldState.error}
            isLoading={loading}
            onChange={(selected: EuiComboBoxOptionOption[]) => {
              if (selected.length) {
                return field.onChange(selected[0].value);
              }

              field.onChange('');
            }}
            onSearchChange={onSearchChange}
            options={indexOptions}
            placeholder={i18n.translate(
              'xpack.observability.slos.sloEdit.customKql.indexSelection.placeholder',
              {
                defaultMessage: 'Select an index or index pattern',
              }
            )}
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

function createIndexOptions(indices: Index[]): Option {
  return {
    label: i18n.translate(
      'xpack.observability.slos.sloEdit.customKql.indexSelection.indexOptionsLabel',
      { defaultMessage: 'Select an existing index' }
    ),
    options: indices
      .map(({ name }) => ({ label: name, value: name }))
      .sort((a, b) => String(a.label).localeCompare(b.label)),
  };
}
