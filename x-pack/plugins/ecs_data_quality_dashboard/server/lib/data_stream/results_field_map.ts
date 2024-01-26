/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMap } from '@kbn/data-stream-adapter';

export const resultsFieldMap: FieldMap = {
  'meta.batchId': { type: 'keyword', required: true },
  'meta.ecsVersion': { type: 'keyword', required: true },
  'meta.errorCount': { type: 'long', required: true },
  'meta.ilmPhase': { type: 'keyword', required: true },
  'meta.indexId': { type: 'keyword', required: true },
  'meta.indexName': { type: 'keyword', required: true },
  'meta.isCheckAll': { type: 'boolean', required: true },
  'meta.numberOfDocuments': { type: 'long', required: true },
  'meta.numberOfFields': { type: 'long', required: true },
  'meta.numberOfIncompatibleFields': { type: 'long', required: true },
  'meta.numberOfEcsFields': { type: 'long', required: true },
  'meta.numberOfCustomFields': { type: 'long', required: true },
  'meta.numberOfIndices': { type: 'long', required: true },
  'meta.numberOfIndicesChecked': { type: 'long', required: true },
  'meta.numberOfSameFamily': { type: 'long', required: true },
  'meta.sameFamilyFields': { type: 'keyword', required: true, array: true },
  'meta.sizeInBytes': { type: 'long', required: true },
  'meta.timeConsumedMs': { type: 'long', required: true },
  'meta.unallowedMappingFields': { type: 'keyword', required: true, array: true },
  'meta.unallowedValueFields': { type: 'keyword', required: true, array: true },
  'rollup.docsCount': { type: 'long', required: true },
  'rollup.error': { type: 'text', required: false },
  'rollup.ilmExplainPhaseCounts': { type: 'object', required: false },
  'rollup.indices': { type: 'long', required: true },
  'rollup.pattern': { type: 'keyword', required: true },
  'rollup.sizeInBytes': { type: 'long', required: true },
  'rollup.ilmExplain': { type: 'object', required: true, array: true },
  'rollup.stats': { type: 'object', required: true, array: true },
  'rollup.results': { type: 'object', required: true, array: true },
};
