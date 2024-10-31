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
import { SuppressionFrequencySelector } from './suppression_frequency_selector';
import { SuppressionFieldsSelector } from './suppression_fields_selector';

interface AlertSuppressionEditProps {
  supportedFieldSpecs: DataViewFieldBase[];
  disabled?: boolean;
  disabledText?: string;
}

export function AlertSuppressionEdit({
  supportedFieldSpecs,
  disabled,
  disabledText,
}: AlertSuppressionEditProps): JSX.Element {
  const [{ groupByFields }] = useFormData({
    watch: 'groupByFields',
  });
  const hasSelectedFields = groupByFields.length > 0;

  return (
    <>
      <SuppressionFieldsSelector
        supportedFieldSpecs={supportedFieldSpecs}
        disabled={disabled}
        disabledText={disabledText}
      />
      <SuppressionDurationSelector disabled={disabled || !hasSelectedFields} />
      <MissingFieldsStrategySelector disabled={disabled || !hasSelectedFields} />
    </>
  );
}
