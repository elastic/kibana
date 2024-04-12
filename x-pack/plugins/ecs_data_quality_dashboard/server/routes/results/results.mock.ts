/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResultDocument } from '../../schemas/result';

export const resultDocument: ResultDocument = {
  batchId: '33d95427-1fd3-43c3-bdeb-74324533a31e',
  indexName: '.ds-logs-endpoint.alerts-default-2023.11.23-000001',
  indexPattern: 'logs-endpoint.alerts-*',
  isCheckAll: false,
  checkedAt: 1706526408000,
  docsCount: 100,
  totalFieldCount: 1582,
  ecsFieldCount: 677,
  customFieldCount: 904,
  incompatibleFieldCount: 1,
  sameFamilyFieldCount: 0,
  sameFamilyFields: [],
  unallowedMappingFields: [],
  unallowedValueFields: ['event.category'],
  sizeInBytes: 173796,
  ilmPhase: 'hot',
  markdownComments: [
    '### .ds-logs-endpoint.alerts-default-2023.11.23-000001\n',
    '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | .ds-logs-endpoint.alerts-default-2023.11.23-000001 | 100 (64,1 %) | 1 | `hot` | 274.6KB |\n\n',
    '### **Incompatible fields** `1` **Same family** `0` **Custom fields** `904` **ECS compliant fields** `677` **All fields** `1582`\n',
    "#### 1 incompatible field\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version 8.6.1.\n\n❌ Detection engine rules referencing these fields may not match them correctly\n❌ Pages may not display some events or fields due to unexpected field mappings or values\n❌ Mappings or field values that don't comply with ECS are not supported\n",
    '\n\n#### Incompatible field values - .ds-logs-endpoint.alerts-default-2023.11.23-000001\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `behavior` (6) |\n\n',
  ],
  ecsVersion: '8.6.1',
  indexId: 'PMhntcuPQ_yhPoNsXiM_hg',
  error: null,
};
