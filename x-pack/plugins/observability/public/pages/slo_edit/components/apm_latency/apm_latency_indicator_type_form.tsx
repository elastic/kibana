/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFlexGroup, EuiFormRow } from '@elastic/eui';
import { Control, Controller, UseFormWatch } from 'react-hook-form';
import type { CreateSLOInput } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';
import {
  Suggestion,
  useFetchApmSuggestions,
} from '../../../../hooks/slo/use_fetch_apm_suggestions';

export interface Props {
  control: Control<CreateSLOInput>;
  watch: UseFormWatch<CreateSLOInput>;
}

interface Option {
  value: string;
  label: string;
}

export function ApmLatencyIndicatorTypeForm({ control, watch }: Props) {
  const [search, setSearch] = useState<string>('');
  const { data: suggestions, loading } = useFetchApmSuggestions({
    fieldName: 'service.name',
    search,
  });
  const [options, setOptions] = useState<Option[]>([]);

  useEffect(() => {
    setOptions(createOptions(suggestions));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions.length]);

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFormRow
        label={i18n.translate('xpack.observability.slos.sloEdit.apmLatency.serviceName', {
          defaultMessage: 'Service name',
        })}
      >
        <Controller
          name="indicator.params.service"
          control={control}
          rules={{ required: true }}
          render={({ field, fieldState }) => (
            <EuiComboBox
              {...field}
              aria-label={i18n.translate(
                'xpack.observability.slos.sloEdit.apmLatency.serviceName.placeholder',
                {
                  defaultMessage: 'Select the APM service',
                }
              )}
              async
              data-test-subj="apmLatencyServiceSelector"
              isClearable={true}
              isInvalid={!!fieldState.error}
              isLoading={loading}
              onChange={(selected: EuiComboBoxOptionOption[]) => {
                if (selected.length) {
                  return field.onChange(selected[0].value);
                }

                field.onChange('');
              }}
              onSearchChange={(value: string) => {
                setSearch(value);
              }}
              options={options}
              placeholder={i18n.translate(
                'xpack.observability.slos.sloEdit.apmLatency.serviceName.placeholder',
                {
                  defaultMessage: 'Select the APM service',
                }
              )}
              selectedOptions={
                !!field.value
                  ? [
                      {
                        value: field.value,
                        label: field.value,
                        'data-test-subj': 'apmLatencyServiceSelectedValue',
                      },
                    ]
                  : []
              }
              singleSelection
            />
          )}
        />
      </EuiFormRow>
    </EuiFlexGroup>
  );
}

function createOptions(suggestions: Suggestion[]): Option[] {
  return suggestions
    .map((suggestion) => ({ label: suggestion, value: suggestion }))
    .sort((a, b) => String(a.label).localeCompare(b.label));
}
