/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { JsonArray, JsonObject, JsonValue } from '@kbn/utility-types';

export type { JsonArray, JsonObject, JsonValue };

export const jsonScalarRT = rt.union([rt.null, rt.boolean, rt.number, rt.string]);
export type JsonScalar = rt.TypeOf<typeof jsonScalarRT>;

export const jsonValueRT: rt.Type<JsonValue> = rt.recursion('JsonValue', () =>
  rt.union([jsonScalarRT, jsonArrayRT, jsonObjectRT])
);

export const jsonArrayRT: rt.Type<JsonArray> = rt.recursion('JsonArray', () =>
  rt.array(jsonValueRT)
);

export const jsonObjectRT: rt.Type<JsonObject> = rt.recursion('JsonObject', () =>
  rt.record(rt.string, jsonValueRT)
);
