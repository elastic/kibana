/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Field } from '../../fields/field';

const DEFAULT_SCALING_FACTOR = 1000;

interface Properties {
  [key: string]: any;
}

export function getDefaultProperties(field: Field): Properties {
  const properties: Properties = {};

  if (field.index !== undefined) {
    properties.index = field.index;
  }
  if (field.doc_values !== undefined) {
    properties.doc_values = field.doc_values;
  }
  if (field.copy_to) {
    properties.copy_to = field.copy_to;
  }

  return properties;
}

export function scaledFloat(field: Field): Properties {
  const fieldProps = getDefaultProperties(field);
  fieldProps.type = 'scaled_float';
  fieldProps.scaling_factor = field.scaling_factor || DEFAULT_SCALING_FACTOR;
  if (field.metric_type) {
    fieldProps.time_series_metric = field.metric_type;
  }

  return fieldProps;
}

export function histogram(field: Field): Properties {
  const fieldProps = getDefaultProperties(field);
  fieldProps.type = 'histogram';

  return fieldProps;
}
