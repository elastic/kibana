/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import React, { useMemo, useState, useCallback, memo } from 'react';
import { EuiFormRow, EuiComboBox } from '@elastic/eui';
import { isEsqlRule } from '../../../../../common/detection_engine/utils';

import type { FieldHook } from '../../../../shared_imports';
import { Field } from '../../../../shared_imports';

import { useEsqlFieldOptions } from '../../hooks/use_esql_fields_options';

interface EsqlFieldsSelectProps {
  dataTestSubj: string;
  field: FieldHook;
  idAria: string;
  isDisabled: boolean;
  placeholder?: string;
  esqlQuery: string | undefined;
}

const fieldDescribedByIds = 'detectionEngineStepDefineRuleEsqlFieldsSelect';

/**
 * Select component, that displays all available(returned from ES|QL query) fields
 * Primary use: is to allow user select fields from result that will be used for suppression of possible duplicated alerts
 */
export const EsqlFieldsSelectComponent: React.FC<EsqlFieldsSelectProps> = ({
  field,
  dataTestSubj,
  idAria,
  isDisabled,
  placeholder,
  esqlQuery,
}: EsqlFieldsSelectProps) => {
  const { options, isLoading } = useEsqlFieldOptions(esqlQuery);

  const fieldEuiFieldProps = useMemo(
    () => ({
      fullWidth: true,
      noSuggestions: false,
      options,
      placeholder,
      onCreateOption: undefined,
      isDisabled: isDisabled || isLoading,
    }),
    [isDisabled, isLoading, options, placeholder]
  );

  return (
    <EuiFormRow
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
      fullWidth
      helpText={field.helpText}
      label={field.label}
      labelAppend={field.labelAppend}
    >
      <Field field={field} idAria={fieldDescribedByIds} euiFieldProps={fieldEuiFieldProps} />
    </EuiFormRow>
  );
};

export const EsqlFieldsSelect = memo(EsqlFieldsSelectComponent);

EsqlFieldsSelect.displayName = 'EsqlFieldsSelect';
