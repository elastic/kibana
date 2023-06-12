/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';

import React, { useMemo } from 'react';

import type { FieldHook } from '../../../../shared_imports';
import { Field } from '../../../../shared_imports';
interface EsqlFieldsSelectProps {
  field: FieldHook;
  options: Array<EuiComboBoxOptionOption<string>>;
  isLoading: boolean;
}

const FIELD_COMBO_BOX_WIDTH = 410;

const fieldDescribedByIds = 'detectionEngineStepDefineRuleEsqlFieldsSelect';

export const EsqlFieldsSelectComponent: React.FC<EsqlFieldsSelectProps> = ({
  options,
  field,
  isLoading,
}: EsqlFieldsSelectProps) => {
  const fieldEuiFieldProps = useMemo(
    () => ({
      fullWidth: true,
      noSuggestions: false,
      options,
      placeholder: 'all available fields from ESQL Query',
      onCreateOption: undefined,
      style: { width: `${FIELD_COMBO_BOX_WIDTH}px` },
      isLoading,
      isDisabled: isLoading,
    }),
    [options, isLoading]
  );

  return <Field field={field} idAria={fieldDescribedByIds} euiFieldProps={fieldEuiFieldProps} />;
};

export const EsqlFieldsSelect = React.memo(EsqlFieldsSelectComponent);
