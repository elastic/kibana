/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Field } from '../../../hooks/slo/use_fetch_index_pattern_fields';

interface Option {
  label: string;
  value: string;
}

export function createOptionsFromFields(fields: Field[]): Option[] {
  return fields
    .map((field) => ({ label: field.name, value: field.name }))
    .sort((a, b) => String(a.label).localeCompare(b.label));
}
