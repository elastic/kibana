/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import { QueryStringInput } from '@kbn/unified-search-plugin/public';
import React, { ReactNode } from 'react';
import { Controller, FieldPath, useFormContext } from 'react-hook-form';
import { useCreateDataView } from '../../../../hooks/use_create_data_view';
import { useKibana } from '../../../../utils/kibana_react';
import { CreateSLOForm } from '../../types';

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
  const { data, dataViews, docLinks, http, notifications, storage, uiSettings, unifiedSearch } =
    useKibana().services;

  const { control, getFieldState } = useFormContext<CreateSLOForm>();
  const { dataView } = useCreateDataView({ indexPatternString });

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
      isInvalid={getFieldState(name).invalid}
      fullWidth
    >
      <Controller
        defaultValue=""
        name={name}
        control={control}
        rules={{
          required: Boolean(required),
        }}
        render={({ field, fieldState }) => (
          <QueryStringInput
            appName="Observability"
            bubbleSubmitEvent={false}
            dataTestSubj={dataTestSubj}
            deps={{
              data,
              dataViews,
              docLinks,
              http,
              notifications,
              storage,
              uiSettings,
              unifiedSearch,
            }}
            disableAutoFocus
            disableLanguageSwitcher
            indexPatterns={dataView ? [dataView] : []}
            isDisabled={!indexPatternString}
            isInvalid={fieldState.invalid}
            languageSwitcherPopoverAnchorPosition="rightDown"
            placeholder={placeholder}
            query={{ query: String(field.value), language: 'kuery' }}
            size="s"
            onChange={(value) => {
              field.onChange(value.query);
            }}
          />
        )}
      />
    </EuiFormRow>
  );
}
