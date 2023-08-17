/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { orUndefined } from '../../../../model';

interface RuleFields<TRequired extends t.Props, TOptional extends t.Props> {
  required: TRequired;
  optional: TOptional;
}

export const buildSchema = <TRequired extends t.Props, TOptional extends t.Props>(
  fields: RuleFields<TRequired, TOptional>
) => {
  return t.intersection([
    t.exact(t.type(fields.required)),
    t.exact(t.type(orUndefined(fields.optional))),
  ]);
};
