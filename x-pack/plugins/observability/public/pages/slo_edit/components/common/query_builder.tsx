/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import React, { ReactNode, useEffect, useState } from 'react';
import { Controller, FieldPath, useFormContext } from 'react-hook-form';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
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
      ui: { QueryStringInput },
    },
  } = useKibana().services;

  const { control, getFieldState, watch } = useFormContext<CreateSLOForm>();

  const { dataView } = useCreateDataView({
    indexPatternString,
  });

  const valueText = watch(name) as string;
  const [inputVal, setInputVal] = useState<string>(valueText);

  useEffect(() => {
    setInputVal(valueText);
  }, [valueText]);

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
      error={getFieldState(name).error?.message}
      fullWidth
    >
      <Controller
        defaultValue=""
        name={name}
        control={control}
        rules={{
          required: Boolean(required) && Boolean(dataView),
          validate: (value) => {
            try {
              if (!dataView) return;
              const ast = fromKueryExpression(String(value));
              toElasticsearchQuery(ast, dataView);
            } catch (e) {
              return e.message;
            }
          },
        }}
        render={({ field, fieldState }) => (
          <QueryStringInput
            appName="Observability"
            dataTestSubj={dataTestSubj}
            disableLanguageSwitcher
            indexPatterns={dataView ? [dataView] : []}
            isDisabled={!dataView}
            isInvalid={fieldState.invalid}
            languageSwitcherPopoverAnchorPosition="rightDown"
            placeholder={placeholder}
            query={{ query: String(inputVal), language: 'kuery' }}
            size="s"
            onSubmit={(value) => {
              field.onChange(value.query);
            }}
            onChange={(value) => {
              setInputVal(String(value.query));
            }}
            submitOnBlur={true}
          />
        )}
      />
    </EuiFormRow>
  );
}
