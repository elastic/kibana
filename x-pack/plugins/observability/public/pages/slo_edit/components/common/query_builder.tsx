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
import { kqlQuerySchema } from '@kbn/slo-schema';
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
        render={({ field, fieldState }) => (
          <Container>
            <SearchBar
              appName="Observability"
              dataTestSubj={dataTestSubj}
              indexPatterns={dataView ? [dataView] : []}
              isDisabled={!dataView}
              placeholder={placeholder}
              query={{
                query: kqlQuerySchema.is(field.value) ? String(field.value) : field.value.kqlQuery,
                language: 'kuery',
              }}
              onQuerySubmit={(value) => {
                if (kqlQuerySchema.is(field.value)) {
                  field.onChange(String(value.query?.query));
                } else {
                  field.onChange({
                    ...(field.value ?? {}),
                    kqlQuery: String(value.query?.query),
                  });
                }
              }}
              onFiltersUpdated={(filters) => {
                if (kqlQuerySchema.is(field.value)) {
                  field.onChange({
                    filters,
                    kqlQuery: field.value,
                  });
                } else {
                  field.onChange({
                    ...(field.value ?? {}),
                    filters,
                  });
                }
              }}
              showDatePicker={false}
              showSubmitButton={false}
              showQueryInput={true}
              disableQueryLanguageSwitcher={true}
              onClearSavedQuery={() => {}}
              filters={kqlQuerySchema.is(field.value) ? [] : field.value?.filters ?? []}
            />
          </Container>
        )}
      />
    </EuiFormRow>
  );
}

const Container = styled.div`
  .uniSearchBar {
    padding: 0;
  }
`;
