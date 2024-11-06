/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { DataViewBase } from '@kbn/es-query';
import type { FieldConfig } from '../../../../shared_imports';
import { UseField } from '../../../../shared_imports';
import type {
  EqlFieldsComboBoxOptions,
  EqlOptions,
  FieldsEqlOptions,
} from '../../../../../common/search_strategy';
import { queryRequiredValidatorFactory } from '../../validators/query_required_validator_factory';
import { debounceAsync } from '../../validators/debounce_async';
import { eqlQueryValidatorFactory } from '../../validators/eql_query_validator_factory';
import { EqlQueryBar } from './eql_query_bar';
import * as i18n from './translations';
import type { FieldValueQueryBar } from '../query_bar';

interface EqlQueryEditProps {
  path: string;
  eqlFieldsComboBoxOptions?: EqlFieldsComboBoxOptions;
  eqlOptions?: EqlOptions;
  dataView: DataViewBase;
  required?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onEqlOptionsChange?: (field: FieldsEqlOptions, newValue: string | undefined) => void;
  onValidityChange?: (arg: boolean) => void;
  onValiditingChange?: (arg: boolean) => void;
}

export function EqlQueryEdit({
  path,
  eqlFieldsComboBoxOptions,
  eqlOptions,
  dataView,
  required,
  loading,
  disabled,
  onEqlOptionsChange,
  onValidityChange,
  onValiditingChange,
}: EqlQueryEditProps): JSX.Element {
  const componentProps = useMemo(
    () => ({
      eqlFieldsComboBoxOptions,
      eqlOptions,
      onEqlOptionsChange,
      isSizeOptionDisabled: true,
      isDisabled: disabled,
      isLoading: loading,
      indexPattern: dataView,
      showFilterBar: true,
      idAria: 'ruleEqlQueryBar',
      dataTestSubj: 'ruleEqlQueryBar',
      onValidityChange,
      onValiditingChange,
    }),
    [
      eqlFieldsComboBoxOptions,
      eqlOptions,
      onEqlOptionsChange,
      onValidityChange,
      onValiditingChange,
      dataView,
      loading,
      disabled,
    ]
  );
  const fieldConfig: FieldConfig<FieldValueQueryBar> = useMemo(
    () => ({
      label: i18n.EQL_QUERY_BAR_LABEL,
      validations: [
        ...(required
          ? [
              {
                validator: queryRequiredValidatorFactory('eql'),
              },
            ]
          : []),
        {
          validator: debounceAsync(
            eqlQueryValidatorFactory(
              dataView.id
                ? {
                    dataViewId: dataView.id,
                    eqlOptions: eqlOptions ?? {},
                  }
                : {
                    indexPatterns: dataView.title.split(','),
                    eqlOptions: eqlOptions ?? {},
                  }
            ),
            300
          ),
        },
      ],
    }),
    [required, dataView.id, dataView.title, eqlOptions]
  );

  return (
    <UseField
      path={path}
      component={EqlQueryBar}
      componentProps={componentProps}
      config={fieldConfig}
    />
  );
}
