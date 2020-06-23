/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { DefaultNamespace } from '../types/default_namespace';
import { DefaultStringArray, NonEmptyString } from '../../siem_common_deps';

export const name = t.string;
export type Name = t.TypeOf<typeof name>;
export const nameOrUndefined = t.union([name, t.undefined]);
export type NameOrUndefined = t.TypeOf<typeof nameOrUndefined>;

export const description = t.string;
export type Description = t.TypeOf<typeof description>;
export const descriptionOrUndefined = t.union([description, t.undefined]);
export type DescriptionOrUndefined = t.TypeOf<typeof descriptionOrUndefined>;

export const list_id = NonEmptyString;
export type ListId = t.TypeOf<typeof list_id>;
export const list_idOrUndefined = t.union([list_id, t.undefined]);
export type ListIdOrUndefined = t.TypeOf<typeof list_idOrUndefined>;

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

export const tags = DefaultStringArray;
export type Tags = t.TypeOf<typeof tags>;
export const tagsOrUndefined = t.union([tags, t.undefined]);
export type TagsOrUndefined = t.TypeOf<typeof tagsOrUndefined>;

export const _tags = DefaultStringArray;
export type _Tags = t.TypeOf<typeof _tags>;
export const _tagsOrUndefined = t.union([_tags, t.undefined]);
export type _TagsOrUndefined = t.TypeOf<typeof _tagsOrUndefined>;

// TODO: Change this into a t.keyof enumeration when we know what types of lists we going to have.
export const exceptionListType = t.string;
export const exceptionListTypeOrUndefined = t.union([exceptionListType, t.undefined]);
export type ExceptionListType = t.TypeOf<typeof exceptionListType>;
export type ExceptionListTypeOrUndefined = t.TypeOf<typeof exceptionListTypeOrUndefined>;

// TODO: Change this into a t.keyof enumeration when we know what types of lists we going to have.
export const exceptionListItemType = t.string;
export type ExceptionListItemType = t.TypeOf<typeof exceptionListItemType>;

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
export type NamespaceType = t.TypeOf<typeof namespace_type>;

export const operator = t.keyof({ excluded: null, included: null });
export type Operator = t.TypeOf<typeof operator>;

export const operator_type = t.keyof({
  exists: null,
  list: null,
  match: null,
  match_any: null,
});
export type OperatorType = t.TypeOf<typeof operator_type>;
export enum OperatorTypeEnum {
  NESTED = 'nested',
  MATCH = 'match',
  MATCH_ANY = 'match_any',
  EXISTS = 'exists',
  LIST = 'list',
}
