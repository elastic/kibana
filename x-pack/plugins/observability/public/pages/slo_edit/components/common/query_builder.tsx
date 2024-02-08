/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { Controller, FieldPath, useFormContext } from 'react-hook-form';
import styled from 'styled-components';
import { KqlWithFiltersSchema } from '@kbn/slo-schema';
import { useCreateDataView } from '../../../../hooks/use_create_data_view';
import { useKibana } from '../../../../utils/kibana_react';
import { CreateSLOForm } from '../../types';
import { OptionalText } from './optional_text';

export interface Props {
  dataTestSubj: string;
  indexPatternString: string | undefined;
  label: string;
  name: FieldPath<CreateSLOForm>;
  placeholder: string;
  required?: boolean;
  tooltip?: ReactNode;
}

export function QueryBuilder({
  dataTestSubj,
  indexPatternString,
  label,
  name,
  placeholder,
  required,
  tooltip,
}: Props) {
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  const { control, getFieldState } = useFormContext<CreateSLOForm>();

  const { dataView } = useCreateDataView({
    indexPatternString,
  });

  return (
    <EuiFormRow
      label={
        !!tooltip ? (
          <span>
            {label} {tooltip}
          </span>
        ) : (
          label
        )
      }
      labelAppend={!required ? <OptionalText /> : undefined}
      isInvalid={getFieldState(name).invalid}
      fullWidth
    >
      <Controller
        defaultValue=""
        name={name}
        control={control}
        rules={{
          required: Boolean(required) && Boolean(dataView),
        }}
        render={({ field, fieldState }) => {
          const existingValue = field.value as KqlWithFiltersSchema;

          return (
            <Container>
              <SearchBar
                appName="Observability"
                dataTestSubj={dataTestSubj}
                indexPatterns={dataView ? [dataView] : []}
                isDisabled={!dataView}
                placeholder={placeholder}
                query={{
                  query:
                    typeof existingValue === 'string'
                      ? String(existingValue)
                      : existingValue.kqlQuery,
                  language: 'kuery',
                }}
                onQuerySubmit={(value) => {
                  if (typeof existingValue === 'string') {
                    field.onChange(String(value.query?.query));
                  } else {
                    field.onChange({
                      ...(existingValue ?? {}),
                      kqlQuery: String(value.query?.query),
                    });
                  }
                }}
                onFiltersUpdated={(filters) => {
                  if (typeof existingValue === 'string') {
                    field.onChange({
                      filters,
                      kqlQuery: existingValue,
                    });
                  } else {
                    field.onChange({
                      ...(existingValue ?? {}),
                      filters,
                    });
                  }
                }}
                showDatePicker={false}
                showSubmitButton={false}
                showQueryInput={true}
                disableQueryLanguageSwitcher={true}
                onClearSavedQuery={() => {}}
                filters={typeof existingValue === 'string' ? [] : existingValue?.filters ?? []}
              />
            </Container>
          );
        }}
      />
    </EuiFormRow>
  );
}

const Container = styled.div`
  .uniSearchBar {
    padding: 0;
  }
`;
