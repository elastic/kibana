/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { NonEmptyString } from '../types/non_empty_string';

export const name = t.string;
export type Name = t.TypeOf<typeof name>;
export const nameOrUndefined = t.union([name, t.undefined]);
export type NameOrUndefined = t.TypeOf<typeof nameOrUndefined>;

export const description = t.string;
export type Description = t.TypeOf<typeof description>;
export const descriptionOrUndefined = t.union([description, t.undefined]);
export type DescriptionOrUndefined = t.TypeOf<typeof descriptionOrUndefined>;

export const list_id = NonEmptyString;
export const list_idOrUndefined = t.union([list_id, t.undefined]);
export type List_idOrUndefined = t.TypeOf<typeof list_idOrUndefined>;

export const item = t.string;
export const created_at = t.string; // TODO: Make this into an ISO Date string check
export const updated_at = t.string; // TODO: Make this into an ISO Date string check
export const updated_by = t.string;
export const created_by = t.string;
export const file = t.object;

export const id = NonEmptyString;
export type Id = t.TypeOf<typeof id>;
export const idOrUndefined = t.union([id, t.undefined]);
export type IdOrUndefined = t.TypeOf<typeof idOrUndefined>;

export const ip = t.string;
export const ipOrUndefined = t.union([ip, t.undefined]);

export const keyword = t.string;
export const keywordOrUndefined = t.union([keyword, t.undefined]);

export const value = t.string;
export const valueOrUndefined = t.union([value, t.undefined]);

export const tie_breaker_id = t.string; // TODO: Use UUID for this instead of a string for validation
export const _index = t.string;

export const type = t.keyof({ ip: null, keyword: null }); // TODO: Add the other data types here

export const typeOrUndefined = t.union([type, t.undefined]);
export type Type = t.TypeOf<typeof type>;

export const meta = t.object;
export type Meta = t.TypeOf<typeof meta>;
export const metaOrUndefined = t.union([meta, t.undefined]);
export type MetaOrUndefined = t.TypeOf<typeof metaOrUndefined>;

export const esDataTypeUnion = t.union([t.type({ ip }), t.type({ keyword })]);
export type EsDataTypeUnion = t.TypeOf<typeof esDataTypeUnion>;
