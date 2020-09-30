/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';
import { NonEmptyString } from './non_empty_string';

export const threat_query = t.string;
export type ThreatQuery = t.TypeOf<typeof threat_query>;
export const threatQueryOrUndefined = t.union([threat_query, t.undefined]);
export type ThreatQueryOrUndefined = t.TypeOf<typeof threatQueryOrUndefined>;

export const threat_filters = t.array(t.unknown); // Filters are not easily type-able yet
export type ThreatFilters = t.TypeOf<typeof threat_filters>;
export const threatFiltersOrUndefined = t.union([threat_filters, t.undefined]);
export type ThreatFiltersOrUndefined = t.TypeOf<typeof threatFiltersOrUndefined>;

export const threatMappingEntries = t.array(
  t.exact(
    t.type({
      field: NonEmptyString,
      type: t.keyof({ mapping: null }),
      value: NonEmptyString,
    })
  )
);
export type ThreatMappingEntries = t.TypeOf<typeof threatMappingEntries>;

export const threat_mapping = t.array(
  t.exact(
    t.type({
      entries: threatMappingEntries,
    })
  )
);
export type ThreatMapping = t.TypeOf<typeof threat_mapping>;

export const threatMappingOrUndefined = t.union([threat_mapping, t.undefined]);
export type ThreatMappingOrUndefined = t.TypeOf<typeof threatMappingOrUndefined>;

export const threat_index = t.string;
export const threatIndexOrUndefined = t.union([threat_index, t.undefined]);
export type ThreatIndexOrUndefined = t.TypeOf<typeof threatIndexOrUndefined>;
