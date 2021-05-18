/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';
import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';
import { DefaultNamespace } from '@kbn/securitysolution-io-ts-list-types';

export const list_id = NonEmptyString;
export type ListId = t.TypeOf<typeof list_id>;
export const list_idOrUndefined = t.union([list_id, t.undefined]);
export type ListIdOrUndefined = t.TypeOf<typeof list_idOrUndefined>;

export const item = t.string;

export const file = t.object;
export const list_type = t.keyof({ item: null, list: null });
export type ListType = t.TypeOf<typeof list_type>;

export const item_id = NonEmptyString;
export type ItemId = t.TypeOf<typeof item_id>;
export const itemIdOrUndefined = t.union([item_id, t.undefined]);
export type ItemIdOrUndefined = t.TypeOf<typeof itemIdOrUndefined>;

export const per_page = t.number; // TODO: Change this out for PositiveNumber from siem
export type PerPage = t.TypeOf<typeof per_page>;

export const perPageOrUndefined = t.union([per_page, t.undefined]);
export type PerPageOrUndefined = t.TypeOf<typeof perPageOrUndefined>;

export const total = t.number; // TODO: Change this out for PositiveNumber from siem
export const totalUndefined = t.union([total, t.undefined]);
export type TotalOrUndefined = t.TypeOf<typeof totalUndefined>;

export const page = t.number; // TODO: Change this out for PositiveNumber from siem
export type Page = t.TypeOf<typeof page>;

export const pageOrUndefined = t.union([page, t.undefined]);
export type PageOrUndefined = t.TypeOf<typeof pageOrUndefined>;

export const sort_field = t.string;
export const sortFieldOrUndefined = t.union([sort_field, t.undefined]);
export type SortFieldOrUndefined = t.TypeOf<typeof sortFieldOrUndefined>;

export const sort_order = t.keyof({ asc: null, desc: null });
export const sortOrderOrUndefined = t.union([sort_order, t.undefined]);
export type SortOrderOrUndefined = t.TypeOf<typeof sortOrderOrUndefined>;

export const filter = t.string;
export type Filter = t.TypeOf<typeof filter>;
export const filterOrUndefined = t.union([filter, t.undefined]);
export type FilterOrUndefined = t.TypeOf<typeof filterOrUndefined>;

export const cursor = t.string;
export type Cursor = t.TypeOf<typeof cursor>;
export const cursorOrUndefined = t.union([cursor, t.undefined]);
export type CursorOrUndefined = t.TypeOf<typeof cursorOrUndefined>;

export const namespace_type = DefaultNamespace;

export const serializer = t.string;
export type Serializer = t.TypeOf<typeof serializer>;

export const serializerOrUndefined = t.union([serializer, t.undefined]);
export type SerializerOrUndefined = t.TypeOf<typeof serializerOrUndefined>;

export const deserializer = t.string;
export type Deserializer = t.TypeOf<typeof deserializer>;

export const deserializerOrUndefined = t.union([deserializer, t.undefined]);
export type DeserializerOrUndefined = t.TypeOf<typeof deserializerOrUndefined>;

export const _version = t.string;
export const _versionOrUndefined = t.union([_version, t.undefined]);
export type _VersionOrUndefined = t.TypeOf<typeof _versionOrUndefined>;

export const immutable = t.boolean;
export type Immutable = t.TypeOf<typeof immutable>;

export const immutableOrUndefined = t.union([immutable, t.undefined]);
export type ImmutableOrUndefined = t.TypeOf<typeof immutableOrUndefined>;

export const value = t.string;
export const valueOrUndefined = t.union([value, t.undefined]);

export const tie_breaker_id = t.string; // TODO: Use UUID for this instead of a string for validation
