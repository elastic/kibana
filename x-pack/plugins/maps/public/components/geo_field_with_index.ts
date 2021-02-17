/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

// Maps can contain geo fields from multiple index patterns. GeoFieldWithIndex is used to:
// 1) Combine the geo field along with associated index pattern state.
// 2) Package asynchronously looked up state via getIndexPatternService() to avoid
// PITA of looking up async state in downstream react consumers.
export type GeoFieldWithIndex = {
  geoFieldName: string;
  geoFieldType: string;
  indexPatternTitle: string;
  indexPatternId: string;
};
