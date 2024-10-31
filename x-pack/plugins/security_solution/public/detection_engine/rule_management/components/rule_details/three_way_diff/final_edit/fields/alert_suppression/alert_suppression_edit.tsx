/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataViewFieldBase } from '@kbn/es-query';
import { useFormData } from '../../../../../../../../shared_imports';
import { MissingFieldsStrategySelector } from './missing_fields_strategy_selector';
import { SuppressionDurationSelector } from './suppression_duration_selector';
import { SuppressionFieldsSelector } from './suppression_fields_selector';
import { SUPPRESSION_FIELDS, type AlertSuppressionFormData } from './form_schema';

interface AlertSuppressionEditProps {
  suppressibleFieldSpecs: DataViewFieldBase[];
  disabled?: boolean;
  disabledText?: string;
}

export function AlertSuppressionEdit({
  suppressibleFieldSpecs,
  disabled,
  disabledText,
}: AlertSuppressionEditProps): JSX.Element {
  const [{ suppressionFields }] = useFormData<AlertSuppressionFormData>({
    watch: SUPPRESSION_FIELDS,
  });
  const hasSelectedFields = suppressionFields?.length > 0;

  return (
    <>
      <SuppressionFieldsSelector
        suppressibleFieldSpecs={suppressibleFieldSpecs}
        disabled={disabled}
        disabledText={disabledText}
      />
      <SuppressionDurationSelector disabled={disabled || !hasSelectedFields} />
      <MissingFieldsStrategySelector disabled={disabled || !hasSelectedFields} />
    </>
  );
}
