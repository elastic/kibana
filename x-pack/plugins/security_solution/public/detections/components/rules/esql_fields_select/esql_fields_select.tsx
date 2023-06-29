/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import React, { useMemo, useState, useCallback, memo } from 'react';

import type { FieldHook } from '../../../../shared_imports';
import { Field } from '../../../../shared_imports';

import { fetchEsqlOptions } from './validators';

interface EsqlFieldsSelectProps {
  field: FieldHook;
  query: string | undefined;
}

const FIELD_COMBO_BOX_WIDTH = 410;

const fieldDescribedByIds = 'detectionEngineStepDefineRuleEsqlFieldsSelect';

export const EsqlFieldsSelectComponent: React.FC<EsqlFieldsSelectProps> = ({
  field,
  query,
}: EsqlFieldsSelectProps) => {
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);

  const onFocusHandler = useCallback(async () => {
    if (!query) {
      return;
    }
    // most likely result already be taken from react-query cache, since query will be validated once user finishes editing query input
    const newOptions = await fetchEsqlOptions(query);
    setOptions(newOptions);
  }, [query]);

  const fieldEuiFieldProps = useMemo(
    () => ({
      fullWidth: true,
      noSuggestions: false,
      options,
      placeholder: 'all available fields from ESQL Query',
      onCreateOption: undefined,
      style: { width: `${FIELD_COMBO_BOX_WIDTH}px` },
      onFocus: onFocusHandler,
    }),
    [options, onFocusHandler]
  );

  return <Field field={field} idAria={fieldDescribedByIds} euiFieldProps={fieldEuiFieldProps} />;
};

export const EsqlFieldsSelect = memo(EsqlFieldsSelectComponent);

EsqlFieldsSelect.displayName = 'EsqlFieldsSelect';
