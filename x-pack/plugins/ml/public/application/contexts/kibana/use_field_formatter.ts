/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMlKibana } from './kibana_context';

export function useFieldFormatter(fieldType: 'bytes') {
  const {
    services: { fieldFormats },
  } = useMlKibana();

  const fieldFormatter = fieldFormats.deserialize({ id: fieldType });
  return fieldFormatter.convert.bind(fieldFormatter);
}
