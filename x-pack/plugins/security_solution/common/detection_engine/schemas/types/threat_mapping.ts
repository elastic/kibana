/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';
import { language } from '../common/schemas';
import { NonEmptyArray } from './non_empty_array';
import { NonEmptyString } from './non_empty_string';
import { PositiveIntegerGreaterThanZero } from './positive_integer_greater_than_zero';

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_query = t.string;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ThreatQuery = t.TypeOf<typeof threat_query>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threatQueryOrUndefined = t.union([threat_query, t.undefined]);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ThreatQueryOrUndefined = t.TypeOf<typeof threatQueryOrUndefined>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_indicator_path = t.string;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ThreatIndicatorPath = t.TypeOf<typeof threat_indicator_path>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threatIndicatorPathOrUndefined = t.union([threat_indicator_path, t.undefined]);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ThreatIndicatorPathOrUndefined = t.TypeOf<typeof threatIndicatorPathOrUndefined>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_filters = t.array(t.unknown); // Filters are not easily type-able yet

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ThreatFilters = t.TypeOf<typeof threat_filters>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threatFiltersOrUndefined = t.union([threat_filters, t.undefined]);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ThreatFiltersOrUndefined = t.TypeOf<typeof threatFiltersOrUndefined>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threatMapEntry = t.exact(
  t.type({
    field: NonEmptyString,
    type: t.keyof({ mapping: null }),
    value: NonEmptyString,
  })
);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ThreatMapEntry = t.TypeOf<typeof threatMapEntry>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threatMappingEntries = t.array(threatMapEntry);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ThreatMappingEntries = t.TypeOf<typeof threatMappingEntries>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threatMap = t.exact(
  t.type({
    entries: threatMappingEntries,
  })
);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ThreatMap = t.TypeOf<typeof threatMap>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_mapping = NonEmptyArray(threatMap, 'NonEmptyArray<ThreatMap>');

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ThreatMapping = t.TypeOf<typeof threat_mapping>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threatMappingOrUndefined = t.union([threat_mapping, t.undefined]);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ThreatMappingOrUndefined = t.TypeOf<typeof threatMappingOrUndefined>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_index = t.array(t.string);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ThreatIndex = t.TypeOf<typeof threat_index>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threatIndexOrUndefined = t.union([threat_index, t.undefined]);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ThreatIndexOrUndefined = t.TypeOf<typeof threatIndexOrUndefined>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_language = t.union([language, t.undefined]);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ThreatLanguage = t.TypeOf<typeof threat_language>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threatLanguageOrUndefined = t.union([threat_language, t.undefined]);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ThreatLanguageOrUndefined = t.TypeOf<typeof threatLanguageOrUndefined>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const concurrent_searches = PositiveIntegerGreaterThanZero;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ConcurrentSearches = t.TypeOf<typeof concurrent_searches>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const concurrentSearchesOrUndefined = t.union([concurrent_searches, t.undefined]);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ConcurrentSearchesOrUndefined = t.TypeOf<typeof concurrentSearchesOrUndefined>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const items_per_search = PositiveIntegerGreaterThanZero;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ItemsPerSearch = t.TypeOf<typeof concurrent_searches>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const itemsPerSearchOrUndefined = t.union([items_per_search, t.undefined]);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ItemsPerSearchOrUndefined = t.TypeOf<typeof itemsPerSearchOrUndefined>;
