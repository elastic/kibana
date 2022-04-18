/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { useMlKibana } from './kibana_context';

/**
 * Set of reasonable defaults for formatters for the ML app.
 */
const defaultParam = {
  [FIELD_FORMAT_IDS.DURATION]: {
    inputFormat: 'milliseconds',
    outputFormat: 'humanizePrecise',
  },
} as Record<FIELD_FORMAT_IDS, object | undefined>;

export function useFieldFormatter(fieldType: FIELD_FORMAT_IDS) {
  const {
    services: { fieldFormats },
  } = useMlKibana();

  const fieldFormatter = fieldFormats.deserialize({
    id: fieldType,
    params: defaultParam[fieldType],
  });
  return fieldFormatter.convert.bind(fieldFormatter);
}
