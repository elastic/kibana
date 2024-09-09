/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMap } from '@kbn/data-stream-adapter';

export const resultsFieldMap: FieldMap = {
  batchId: { type: 'keyword', required: true },
  indexName: { type: 'keyword', required: true },
  indexPattern: { type: 'keyword', required: true },
  isCheckAll: { type: 'boolean', required: true },
  checkedAt: { type: 'date', required: true },
  checkedBy: { type: 'keyword', required: true },
  docsCount: { type: 'long', required: true },
  totalFieldCount: { type: 'long', required: true },
  ecsFieldCount: { type: 'long', required: true },
  customFieldCount: { type: 'long', required: true },
  incompatibleFieldMappingItems: { type: 'nested', required: true, array: true },
  'incompatibleFieldMappingItems.fieldName': { type: 'keyword', required: true },
  'incompatibleFieldMappingItems.expectedValue': { type: 'keyword', required: true },
  'incompatibleFieldMappingItems.actualValue': { type: 'keyword', required: true },
  'incompatibleFieldMappingItems.description': { type: 'keyword', required: true },
  incompatibleFieldValueItems: { type: 'nested', required: true, array: true },
  'incompatibleFieldValueItems.fieldName': { type: 'keyword', required: true },
  'incompatibleFieldValueItems.expectedValues': { type: 'keyword', required: true },
  'incompatibleFieldValueItems.actualValues': { type: 'nested', required: true, array: true },
  'incompatibleFieldValueItems.actualValues.name': { type: 'keyword', required: true },
  'incompatibleFieldValueItems.actualValues.count': { type: 'keyword', required: true },
  'incompatibleFieldValueItems.description': { type: 'keyword', required: true },
  incompatibleFieldCount: { type: 'long', required: true },
  sameFamilyFieldCount: { type: 'long', required: true },
  sameFamilyFieldItems: { type: 'nested', required: true, array: true },
  'sameFamilyFieldItems.fieldName': { type: 'keyword', required: true },
  'sameFamilyFieldItems.expectedValue': { type: 'keyword', required: true },
  'sameFamilyFieldItems.actualValue': { type: 'keyword', required: true },
  'sameFamilyFieldItems.description': { type: 'keyword', required: true },
  sameFamilyFields: { type: 'keyword', required: true, array: true },
  unallowedMappingFields: { type: 'keyword', required: true, array: true },
  unallowedValueFields: { type: 'keyword', required: true, array: true },
  sizeInBytes: { type: 'long', required: true },
  ilmPhase: { type: 'keyword', required: false },
  markdownComments: { type: 'text', required: true, array: true },
  ecsVersion: { type: 'keyword', required: true },
  indexId: { type: 'keyword', required: false },
  error: { type: 'text', required: false },
};
