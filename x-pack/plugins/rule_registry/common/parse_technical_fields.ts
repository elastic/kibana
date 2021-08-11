/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeOrThrow } from '@kbn/io-ts-utils';
import { technicalRuleFieldMap } from './assets/field_maps/technical_rule_field_map';
import { runtimeTypeFromFieldMap } from './field_map';

const technicalFieldsRT = runtimeTypeFromFieldMap(technicalRuleFieldMap);

export const parseTechnicalFields = (fieldMap: unknown) => {
  const decodedFieldMap = decodeOrThrow(technicalFieldsRT)(fieldMap);

  return technicalFieldsRT.encode(decodedFieldMap);
};

export type ParsedTechnicalFields = ReturnType<typeof parseTechnicalFields>;
