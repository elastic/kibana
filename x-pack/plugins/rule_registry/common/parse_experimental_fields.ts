/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isLeft } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import {
  experimentalRuleFieldMap,
  ExperimentalRuleFieldMap,
} from './assets/field_maps/experimental_rule_field_map';

import { runtimeTypeFromFieldMap } from './field_map';

const experimentalFieldRuntimeType =
  runtimeTypeFromFieldMap<ExperimentalRuleFieldMap>(experimentalRuleFieldMap);

export const parseExperimentalFields = (input: unknown) => {
  const validate = experimentalFieldRuntimeType.decode(input);

  if (isLeft(validate)) {
    throw new Error(PathReporter.report(validate).join('\n'));
  }
  return experimentalFieldRuntimeType.encode(validate.right);
};

export type ParsedExperimentalFields = ReturnType<typeof parseExperimentalFields>;
