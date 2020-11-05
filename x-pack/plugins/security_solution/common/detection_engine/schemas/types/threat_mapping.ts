/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';
import { language } from '../common/schemas';
import { NonEmptyString } from './non_empty_string';
import { PositiveIntegerGreaterThanZero } from './positive_integer_greater_than_zero';

export const threat_query = t.string;
export type ThreatQuery = t.TypeOf<typeof threat_query>;
export const threatQueryOrUndefined = t.union([threat_query, t.undefined]);
export type ThreatQueryOrUndefined = t.TypeOf<typeof threatQueryOrUndefined>;

export const threat_filters = t.array(t.unknown); // Filters are not easily type-able yet
export type ThreatFilters = t.TypeOf<typeof threat_filters>;
export const threatFiltersOrUndefined = t.union([threat_filters, t.undefined]);
export type ThreatFiltersOrUndefined = t.TypeOf<typeof threatFiltersOrUndefined>;

export const threatMapEntry = t.exact(
  t.type({
    field: NonEmptyString,
    type: t.keyof({ mapping: null }),
    value: NonEmptyString,
  })
);

export type ThreatMapEntry = t.TypeOf<typeof threatMapEntry>;

export const threatMappingEntries = t.array(threatMapEntry);
export type ThreatMappingEntries = t.TypeOf<typeof threatMappingEntries>;

export const threatMap = t.exact(
  t.type({
    entries: threatMappingEntries,
  })
);
export type ThreatMap = t.TypeOf<typeof threatMap>;

export const threat_mapping = t.array(threatMap);
export type ThreatMapping = t.TypeOf<typeof threat_mapping>;

export const threatMappingOrUndefined = t.union([threat_mapping, t.undefined]);
export type ThreatMappingOrUndefined = t.TypeOf<typeof threatMappingOrUndefined>;

export const threat_index = t.array(t.string);
export type ThreatIndex = t.TypeOf<typeof threat_index>;
export const threatIndexOrUndefined = t.union([threat_index, t.undefined]);
export type ThreatIndexOrUndefined = t.TypeOf<typeof threatIndexOrUndefined>;

export const threat_language = t.union([language, t.undefined]);
export type ThreatLanguage = t.TypeOf<typeof threat_language>;
export const threatLanguageOrUndefined = t.union([threat_language, t.undefined]);
export type ThreatLanguageOrUndefined = t.TypeOf<typeof threatLanguageOrUndefined>;

export const concurrent_searches = PositiveIntegerGreaterThanZero;
export type ConcurrentSearches = t.TypeOf<typeof concurrent_searches>;
export const concurrentSearchesOrUndefined = t.union([concurrent_searches, t.undefined]);
export type ConcurrentSearchesOrUndefined = t.TypeOf<typeof concurrentSearchesOrUndefined>;

export const items_per_search = PositiveIntegerGreaterThanZero;
export type ItemsPerSearch = t.TypeOf<typeof concurrent_searches>;
export const itemsPerSearchOrUndefined = t.union([items_per_search, t.undefined]);
export type ItemsPerSearchOrUndefined = t.TypeOf<typeof itemsPerSearchOrUndefined>;
