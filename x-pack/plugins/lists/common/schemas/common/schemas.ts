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

export const binary = t.string;
export const binaryOrUndefined = t.union([binary, t.undefined]);

export const boolean = t.string;
export const booleanOrUndefined = t.union([boolean, t.undefined]);

export const byte = t.string;
export const byteOrUndefined = t.union([byte, t.undefined]);

export const date = t.string;
export const dateOrUndefined = t.union([date, t.undefined]);

export const date_nanos = t.string;
export const dateNanosOrUndefined = t.union([date_nanos, t.undefined]);

export const double = t.string;
export const doubleOrUndefined = t.union([double, t.undefined]);

export const double_range = t.string;
export const doubleRangeOrUndefined = t.union([double, t.undefined]);

export const date_range = t.string;
export const dateRangeOrUndefined = t.union([date_range, t.undefined]);

export const flattened = t.string;
export const flattenedOrUndefined = t.union([flattened, t.undefined]);

export const float = t.string;
export const floatOrUndefined = t.union([float, t.undefined]);

export const float_range = t.string;
export const floatRangeOrUndefined = t.union([float_range, t.undefined]);

export const geo_point = t.string;
export const geoPointOrUndefined = t.union([geo_point, t.undefined]);

export const geo_shape = t.string;
export const geoShapeOrUndefined = t.union([geo_shape, t.undefined]);

export const half_float = t.string;
export const halfFloatOrUndefined = t.union([half_float, t.undefined]);

export const histogram = t.string;
export const histogramOrUndefined = t.union([histogram, t.undefined]);

export const integer = t.string;
export const integerOrUndefined = t.union([integer, t.undefined]);

export const integer_range = t.string;
export const integerRangeOrUndefined = t.union([integer_range, t.undefined]);

export const ip = t.string;
export const ipOrUndefined = t.union([ip, t.undefined]);

export const ip_range = t.string;
export const ipRangeOrUndefined = t.union([ip_range, t.undefined]);

export const keyword = t.string;
export const keywordOrUndefined = t.union([keyword, t.undefined]);

export const text = t.string;
export const textOrUndefined = t.union([text, t.undefined]);

export const long = t.string;
export const longOrUndefined = t.union([long, t.undefined]);

export const long_range = t.string;
export const longRangeOrUndefined = t.union([long_range, t.undefined]);

export const shape = t.string;
export const shapeOrUndefined = t.union([shape, t.undefined]);

export const short = t.string;
export const shortOrUndefined = t.union([short, t.undefined]);

export const value = t.string;
export const valueOrUndefined = t.union([value, t.undefined]);

export const tie_breaker_id = t.string; // TODO: Use UUID for this instead of a string for validation
export const _index = t.string;

export const type = t.keyof({
  binary: null,
  boolean: null,
  byte: null,
  date: null,
  date_nanos: null,
  date_range: null,
  double: null,
  double_range: null,
  flattened: null,
  float: null,
  float_range: null,
  geo_point: null,
  geo_shape: null,
  half_float: null,
  histogram: null,
  integer: null,
  integer_range: null,
  ip: null,
  ip_range: null,
  keyword: null,
  long: null,
  long_range: null,
  shape: null,
  short: null,
  text: null,
});

export const typeOrUndefined = t.union([type, t.undefined]);
export type Type = t.TypeOf<typeof type>;

export const meta = t.object;
export type Meta = t.TypeOf<typeof meta>;
export const metaOrUndefined = t.union([meta, t.undefined]);
export type MetaOrUndefined = t.TypeOf<typeof metaOrUndefined>;

export const esDataTypeUnion = t.union([
  t.type({ binary }),
  t.type({ boolean }),
  t.type({ byte }),
  t.type({ date }),
  t.type({ date_nanos }),
  t.type({ date_range }),
  t.type({ double }),
  t.type({ double_range }),
  t.type({ flattened }),
  t.type({ float }),
  t.type({ float_range }),
  t.type({ geo_point }),
  t.type({ geo_shape }),
  t.type({ half_float }),
  t.type({ histogram }),
  t.type({ integer }),
  t.type({ integer_range }),
  t.type({ ip }),
  t.type({ ip_range }),
  t.type({ keyword }),
  t.type({ long }),
  t.type({ long_range }),
  t.type({ shape }),
  t.type({ short }),
  t.type({ text }),
]);

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
