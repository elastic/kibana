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

export const float = t.string;
export const floatOrUndefined = t.union([float, t.undefined]);

export const geo_shape = t.string;
export const geoShapeOrUndefined = t.union([geo_shape, t.undefined]);

export const half_float = t.string;
export const halfFloatOrUndefined = t.union([half_float, t.undefined]);

export const integer = t.string;
export const integerOrUndefined = t.union([integer, t.undefined]);

export const ip = t.string;
export const ipOrUndefined = t.union([ip, t.undefined]);

export const keyword = t.string;
export const keywordOrUndefined = t.union([keyword, t.undefined]);

export const text = t.string;
export const textOrUndefined = t.union([text, t.undefined]);

export const long = t.string;
export const longOrUndefined = t.union([long, t.undefined]);

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
  float: null,
  float_range: null,
  geo_point: null,
  geo_shape: null,
  half_float: null,
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

export const esDataTypeRange = t.exact(t.type({ gte: t.string, lte: t.string }));

export const date_range = esDataTypeRange;
export const dateRangeOrUndefined = t.union([date_range, t.undefined]);

export const double_range = esDataTypeRange;
export const doubleRangeOrUndefined = t.union([double_range, t.undefined]);

export const float_range = esDataTypeRange;
export const floatRangeOrUndefined = t.union([float_range, t.undefined]);

export const integer_range = esDataTypeRange;
export const integerRangeOrUndefined = t.union([integer_range, t.undefined]);

// ip_range can be just a CIDR value as a range
export const ip_range = t.union([esDataTypeRange, t.string]);
export const ipRangeOrUndefined = t.union([ip_range, t.undefined]);

export const long_range = esDataTypeRange;
export const longRangeOrUndefined = t.union([long_range, t.undefined]);

export type EsDataTypeRange = t.TypeOf<typeof esDataTypeRange>;

export const esDataTypeRangeTerm = t.union([
  t.exact(t.type({ date_range })),
  t.exact(t.type({ double_range })),
  t.exact(t.type({ float_range })),
  t.exact(t.type({ integer_range })),
  t.exact(t.type({ ip_range })),
  t.exact(t.type({ long_range })),
]);

export type EsDataTypeRangeTerm = t.TypeOf<typeof esDataTypeRangeTerm>;

export const esDataTypeGeoPointRange = t.exact(t.type({ lat: t.string, lon: t.string }));
export type EsDataTypeGeoPointRange = t.TypeOf<typeof esDataTypeGeoPointRange>;

export const geo_point = t.union([esDataTypeGeoPointRange, t.string]);
export type GeoPoint = t.TypeOf<typeof geo_point>;

export const geoPointOrUndefined = t.union([geo_point, t.undefined]);

export const esDataTypeGeoPoint = t.exact(t.type({ geo_point }));
export type EsDataTypeGeoPoint = t.TypeOf<typeof esDataTypeGeoPoint>;

export const esDataTypeGeoShape = t.union([
  t.exact(t.type({ geo_shape: t.string })),
  t.exact(t.type({ shape: t.string })),
]);

export type EsDataTypeGeoShape = t.TypeOf<typeof esDataTypeGeoShape>;

export const esDataTypeSingle = t.union([
  t.exact(t.type({ binary })),
  t.exact(t.type({ boolean })),
  t.exact(t.type({ byte })),
  t.exact(t.type({ date })),
  t.exact(t.type({ date_nanos })),
  t.exact(t.type({ double })),
  t.exact(t.type({ float })),
  t.exact(t.type({ half_float })),
  t.exact(t.type({ integer })),
  t.exact(t.type({ ip })),
  t.exact(t.type({ keyword })),
  t.exact(t.type({ long })),
  t.exact(t.type({ short })),
  t.exact(t.type({ text })),
]);

export type EsDataTypeSingle = t.TypeOf<typeof esDataTypeSingle>;

export const esDataTypeUnion = t.union([
  esDataTypeRangeTerm,
  esDataTypeGeoPoint,
  esDataTypeGeoShape,
  esDataTypeSingle,
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

export const exceptionListType = t.keyof({ detection: null, endpoint: null });
export const exceptionListTypeOrUndefined = t.union([exceptionListType, t.undefined]);
export type ExceptionListType = t.TypeOf<typeof exceptionListType>;
export type ExceptionListTypeOrUndefined = t.TypeOf<typeof exceptionListTypeOrUndefined>;
export enum ExceptionListTypeEnum {
  DETECTION = 'detection',
  ENDPOINT = 'endpoint',
}

export const exceptionListItemType = t.keyof({ simple: null });
export const exceptionListItemTypeOrUndefined = t.union([exceptionListItemType, t.undefined]);
export type ExceptionListItemType = t.TypeOf<typeof exceptionListItemType>;
export type ExceptionListItemTypeOrUndefined = t.TypeOf<typeof exceptionListItemTypeOrUndefined>;

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
export enum OperatorEnum {
  INCLUDED = 'included',
  EXCLUDED = 'excluded',
}

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

export const serializer = t.string;
export type Serializer = t.TypeOf<typeof serializer>;

export const serializerOrUndefined = t.union([serializer, t.undefined]);
export type SerializerOrUndefined = t.TypeOf<typeof serializerOrUndefined>;

export const deserializer = t.string;
export type Deserializer = t.TypeOf<typeof deserializer>;

export const deserializerOrUndefined = t.union([deserializer, t.undefined]);
export type DeserializerOrUndefined = t.TypeOf<typeof deserializerOrUndefined>;
