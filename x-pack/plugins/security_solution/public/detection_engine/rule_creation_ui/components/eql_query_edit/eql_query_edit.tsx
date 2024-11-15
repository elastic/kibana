/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { DataViewBase } from '@kbn/es-query';
import type { FieldConfig } from '../../../../shared_imports';
import { UseField, UseMultiFields } from '../../../../shared_imports';
import type { EqlFieldsComboBoxOptions, EqlOptions } from '../../../../../common/search_strategy';
import { queryRequiredValidatorFactory } from '../../validators/query_required_validator_factory';
import { debounceAsync } from '../../validators/debounce_async';
import { eqlQueryValidatorFactory } from '../../validators/eql_query_validator_factory';
import { EqlQueryBar } from './eql_query_bar';
import * as i18n from './translations';
import type { FieldValueQueryBar } from '../query_bar';

interface EqlQueryEditProps {
  path: string;
  eqlOptionsPath?: string;
  fieldsToValidateOnChange?: string | string[];
  eqlFieldsComboBoxOptions?: EqlFieldsComboBoxOptions;
  showEqlSizeOption?: boolean;
  showFilterBar?: boolean;
  dataView: DataViewBase;
  required?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onValidityChange?: (arg: boolean) => void;
}

export function EqlQueryEdit({
  path,
  eqlOptionsPath,
  fieldsToValidateOnChange,
  eqlFieldsComboBoxOptions,
  showEqlSizeOption = false,
  showFilterBar = false,
  dataView,
  required,
  loading,
  disabled,
  onValidityChange,
}: EqlQueryEditProps): JSX.Element {
  const componentProps = useMemo(
    () => ({
      eqlFieldsComboBoxOptions,
      isSizeOptionDisabled: !showEqlSizeOption,
      isDisabled: disabled,
      isLoading: loading,
      indexPattern: dataView,
      showFilterBar,
      idAria: 'ruleEqlQueryBar',
      dataTestSubj: 'ruleEqlQueryBar',
      onValidityChange,
    }),
    [
      eqlFieldsComboBoxOptions,
      showEqlSizeOption,
      showFilterBar,
      onValidityChange,
      dataView,
      loading,
      disabled,
    ]
  );
  const fieldConfig: FieldConfig<FieldValueQueryBar> = useMemo(
    () => ({
      label: i18n.EQL_QUERY_BAR_LABEL,
      fieldsToValidateOnChange: fieldsToValidateOnChange
        ? [path, fieldsToValidateOnChange].flat()
        : undefined,
      validations: [
        ...(required
          ? [
              {
                validator: queryRequiredValidatorFactory('eql'),
              },
            ]
          : []),
        {
          validator: debounceAsync((...args) => {
            const [{ formData }] = args;
            const eqlOptions =
              eqlOptionsPath && formData[eqlOptionsPath] ? formData[eqlOptionsPath] : {};

            return eqlQueryValidatorFactory(
              dataView.id
                ? {
                    dataViewId: dataView.id,
                    eqlOptions,
                  }
                : {
                    indexPatterns: dataView.title.split(','),
                    eqlOptions,
                  }
            )(...args);
          }, 300),
        },
      ],
    }),
    [eqlOptionsPath, required, dataView.id, dataView.title, path, fieldsToValidateOnChange]
  );

  if (eqlOptionsPath) {
    return (
      <UseMultiFields<{
        eqlQuery: FieldValueQueryBar;
        eqlOptions: EqlOptions;
      }>
        fields={{
          eqlQuery: {
            path,
            config: fieldConfig,
          },
          eqlOptions: {
            path: eqlOptionsPath,
          },
        }}
      >
        {({ eqlQuery, eqlOptions }) => (
          <EqlQueryBar field={eqlQuery} eqlOptionsField={eqlOptions} {...componentProps} />
        )}
      </UseMultiFields>
    );
  }

  return (
    <UseField
      path={path}
      component={EqlQueryBar}
      componentProps={componentProps}
      config={fieldConfig}
    />
  );
}
