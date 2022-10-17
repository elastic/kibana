/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

interface RuleFields<
  Required extends t.Props,
  Optional extends t.Props,
  Defaultable extends t.Props
> {
  required: Required;
  optional: Optional;
  defaultable: Defaultable;
}

export const buildRuleSchemas = <R extends t.Props, O extends t.Props, D extends t.Props>(
  fields: RuleFields<R, O, D>
) => {
  return {
    create: buildCreateRuleSchema(fields.required, fields.optional, fields.defaultable),
    patch: buildPatchRuleSchema(fields.required, fields.optional, fields.defaultable),
    response: buildResponseRuleSchema(fields.required, fields.optional, fields.defaultable),
  };
};

const buildCreateRuleSchema = <
  Required extends t.Props,
  Optional extends t.Props,
  Defaultable extends t.Props
>(
  requiredFields: Required,
  optionalFields: Optional,
  defaultableFields: Defaultable
) => {
  return t.intersection([
    t.exact(t.type(requiredFields)),
    t.exact(t.partial(optionalFields)),
    t.exact(t.partial(defaultableFields)),
  ]);
};

const buildPatchRuleSchema = <
  Required extends t.Props,
  Optional extends t.Props,
  Defaultable extends t.Props
>(
  requiredFields: Required,
  optionalFields: Optional,
  defaultableFields: Defaultable
) => {
  return t.intersection([
    t.partial(requiredFields),
    t.partial(optionalFields),
    t.partial(defaultableFields),
  ]);
};

type OrUndefined<P extends t.Props> = {
  [K in keyof P]: P[K] | t.UndefinedC;
};

export const buildResponseRuleSchema = <
  Required extends t.Props,
  Optional extends t.Props,
  Defaultable extends t.Props
>(
  requiredFields: Required,
  optionalFields: Optional,
  defaultableFields: Defaultable
) => {
  // This bit of logic is to force all fields to be accounted for in conversions from the internal
  // rule schema to the response schema. Rather than use `t.partial`, which makes each field optional,
  // we make each field required but possibly undefined. The result is that if a field is forgotten in
  // the conversion from internal schema to response schema TS will report an error. If we just used t.partial
  // instead, then optional fields can be accidentally omitted from the conversion - and any actual values
  // in those fields internally will be stripped in the response.
  const optionalWithUndefined = Object.keys(optionalFields).reduce<t.Props>((acc, key) => {
    acc[key] = t.union([optionalFields[key], t.undefined]);
    return acc;
  }, {}) as OrUndefined<Optional>;
  return t.intersection([
    t.exact(t.type(requiredFields)),
    t.exact(t.type(optionalWithUndefined)),
    t.exact(t.type(defaultableFields)),
  ]);
};
