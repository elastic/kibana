/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLeft } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { pick } from 'lodash';
import {
  technicalRuleFieldMap,
  TechnicalRuleFieldMap,
} from './assets/field_maps/technical_rule_field_map';
import { runtimeTypeFromFieldMap } from './field_map';

const technicalFieldRuntimeType =
  runtimeTypeFromFieldMap<TechnicalRuleFieldMap>(technicalRuleFieldMap);

export const parseTechnicalFields = (input: unknown, partial = false) => {
  const decodePartial = (alert: unknown) => {
    const limitedFields = pick(technicalRuleFieldMap, Object.keys(alert as object));
    const partialTechnicalFieldRuntimeType = runtimeTypeFromFieldMap<TechnicalRuleFieldMap>(
      limitedFields as unknown as TechnicalRuleFieldMap
    );
    return partialTechnicalFieldRuntimeType.decode(alert);
  };

  const validate = partial ? decodePartial(input) : technicalFieldRuntimeType.decode(input);

  if (isLeft(validate)) {
    throw new Error(PathReporter.report(validate).join('\n'));
  }
  return technicalFieldRuntimeType.encode(validate.right);
};

export type ParsedTechnicalFields = ReturnType<typeof parseTechnicalFields>;
