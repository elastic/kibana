/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import React, { useMemo, useState, useCallback, memo } from 'react';
import { isEsqlRule } from '../../../../../common/detection_engine/utils';

import type { FieldHook } from '../../../../shared_imports';
import { Field } from '../../../../shared_imports';
import type { DefineStepRule } from '../../../pages/detection_engine/rules/types';

import { fetchEsqlOptions } from './validators';
import * as i18n from './translations';

interface EsqlFieldsSelectProps {
  field: FieldHook;
  getFormData: () => DefineStepRule;
}

const FIELD_COMBO_BOX_WIDTH = 410;

const fieldDescribedByIds = 'detectionEngineStepDefineRuleEsqlFieldsSelect';

/**
 * Select component, that displays all available(returned from ES|QL query) fields
 * Primary use: is to allow user select fields from result that will be used for suppression of possible duplicated alerts
 */
export const EsqlFieldsSelectComponent: React.FC<EsqlFieldsSelectProps> = ({
  field,
  getFormData,
}: EsqlFieldsSelectProps) => {
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);

  const onFocusHandler = useCallback(async () => {
    const formData = getFormData();
    const query = formData.queryBar.query.query;
    const ruleType = formData.ruleType;

    if (typeof query !== 'string') {
      return;
    }

    if (!query && !isEsqlRule(ruleType)) {
      return;
    }

    // most likely result already will be taken from react-query cache, since query will be validated once user finishes editing query input
    const newOptions = await fetchEsqlOptions(query);
    setOptions(newOptions);
  }, [getFormData]);

  const fieldEuiFieldProps = useMemo(
    () => ({
      fullWidth: true,
      noSuggestions: false,
      options,
      placeholder: i18n.ESQL_FIELDS_SELECT_PLACEHOLDER,
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
