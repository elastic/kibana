/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { type FieldSpec } from '@kbn/data-views-plugin/common';
import { type FieldHook, UseMultiFields } from '../../../../shared_imports';
import { ThresholdInput } from '../../../rule_creation_ui/components/threshold_input';
import {
  THRESHOLD_FIELD_CONFIG,
  THRESHOLD_VALUE_CONFIG,
  getCardinalityFieldConfig,
  getCardinalityValueConfig,
} from './field_configs';

interface ThresholdEditProps {
  path: string;
  esFields: FieldSpec[];
  direction?: 'row' | 'column';
}

export function ThresholdEdit({
  path,
  esFields,
  direction = 'row',
}: ThresholdEditProps): JSX.Element {
  const ThresholdInputChildren = useCallback(
    ({
      thresholdField,
      thresholdValue,
      thresholdCardinalityField,
      thresholdCardinalityValue,
    }: Record<string, FieldHook>) => (
      <ThresholdInput
        browserFields={esFields}
        thresholdField={thresholdField}
        thresholdValue={thresholdValue}
        thresholdCardinalityField={thresholdCardinalityField}
        thresholdCardinalityValue={thresholdCardinalityValue}
        direction={direction}
      />
    ),
    [esFields, direction]
  );

  const cardinalityFieldConfig = useMemo(() => getCardinalityFieldConfig(path), [path]);
  const cardinalityValueConfig = useMemo(() => getCardinalityValueConfig(path), [path]);

  return (
    <UseMultiFields
      fields={{
        thresholdField: {
          path: `${path}.field`,
          config: THRESHOLD_FIELD_CONFIG,
        },
        thresholdValue: {
          path: `${path}.value`,
          config: THRESHOLD_VALUE_CONFIG,
        },
        thresholdCardinalityField: {
          path: `${path}.cardinality.field`,
          config: cardinalityFieldConfig,
        },
        thresholdCardinalityValue: {
          path: `${path}.cardinality.value`,
          config: cardinalityValueConfig,
        },
      }}
    >
      {ThresholdInputChildren}
    </UseMultiFields>
  );
}
