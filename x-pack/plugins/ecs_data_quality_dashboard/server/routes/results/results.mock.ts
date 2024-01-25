/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResultDocument } from '../../schemas/result';

export const resultDocument: ResultDocument = {
  '@timestamp': 1622767273955,
  meta: {
    batchId: 'aae36cd8-3825-4ad1-baa4-79bdf4617f8a',
    ecsVersion: '8.6.1',
    errorCount: 0,
    ilmPhase: 'hot',
    indexId: 'aO29KOwtQ3Snf-Pit5Wf4w',
    indexName: '.internal.alerts-security.alerts-default-000001',
    isCheckAll: true,
    numberOfDocuments: 20,
    numberOfFields: 1726,
    numberOfIncompatibleFields: 2,
    numberOfEcsFields: 1440,
    numberOfCustomFields: 284,
    numberOfIndices: 1,
    numberOfIndicesChecked: 1,
    numberOfSameFamily: 0,
    sameFamilyFields: [],
    sizeInBytes: 506471,
    timeConsumedMs: 85,
    unallowedMappingFields: [],
    unallowedValueFields: ['event.category', 'event.outcome'],
  },
  rollup: {
    docsCount: 20,
    error: null,
    ilmExplain: [
      {
        _indexName: '.internal.alerts-security.alerts-default-000001',
        index: '.internal.alerts-security.alerts-default-000001',
        managed: true,
        policy: '.alerts-ilm-policy',
        index_creation_date_millis: 1700757268526,
        time_since_index_creation: '20.99d',
        lifecycle_date_millis: 1700757268526,
        age: '20.99d',
        phase: 'hot',
        phase_time_millis: 1700757270294,
        action: 'rollover',
        action_time_millis: 1700757273955,
        step: 'check-rollover-ready',
        step_time_millis: 1700757273955,
        phase_execution: {
          policy: '.alerts-ilm-policy',
          phase_definition: {
            min_age: '0ms',
            actions: {
              rollover: {
                max_age: '30d',
                max_primary_shard_size: '50gb',
              },
            },
          },
          version: 1,
          modified_date_in_millis: 1700757266723,
        },
      },
    ],
    ilmExplainPhaseCounts: {
      hot: 1,
      warm: 0,
      cold: 0,
      frozen: 0,
      unmanaged: 0,
    },
    indices: 1,
    pattern: '.alerts-security.alerts-default',
    results: [
      {
        _indexName: '.internal.alerts-security.alerts-default-000001',
        docsCount: 20,
        error: null,
        ilmPhase: 'hot',
        incompatible: 2,
        indexName: '.internal.alerts-security.alerts-default-000001',
        markdownComments: [
          '### .internal.alerts-security.alerts-default-000001\n',
          '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | .internal.alerts-security.alerts-default-000001 | 20 (100,0 %) | 2 | `hot` | 494.6KB |\n\n',
          '### **Incompatible fields** `2` **Same family** `0` **Custom fields** `284` **ECS compliant fields** `1440` **All fields** `1726`\n',
          "#### 2 incompatible fields\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version 8.6.1.\n\n❌ Detection engine rules referencing these fields may not match them correctly\n❌ Pages may not display some events or fields due to unexpected field mappings or values\n❌ Mappings or field values that don't comply with ECS are not supported\n",
          '\n\n#### Incompatible field values - .internal.alerts-security.alerts-default-000001\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `behavior` (1) |\n| event.outcome | `failure`, `success`, `unknown` | `` (12) |\n\n',
        ],
        pattern: '.alerts-security.alerts-default',
        sameFamily: 0,
      },
    ],
    sizeInBytes: 506471,
    stats: [
      {
        _indexName: '.internal.alerts-security.alerts-default-000001',
        uuid: 'aO29KOwtQ3Snf-Pit5Wf4w',
        health: 'green',
        status: 'open',
      },
    ],
  },
};

export const resultBody = {
  meta: {
    batchId: 'aae36cd8-3825-4ad1-baa4-79bdf4617f8a',
    ecsVersion: '8.6.1',
    errorCount: 0,
    ilmPhase: 'hot',
    indexId: 'aO29KOwtQ3Snf-Pit5Wf4w',
    indexName: '.internal.alerts-security.alerts-default-000001',
    isCheckAll: true,
    numberOfDocuments: 20,
    numberOfFields: 1726,
    numberOfIncompatibleFields: 2,
    numberOfEcsFields: 1440,
    numberOfCustomFields: 284,
    numberOfIndices: 1,
    numberOfIndicesChecked: 1,
    numberOfSameFamily: 0,
    sameFamilyFields: [],
    sizeInBytes: 506471,
    timeConsumedMs: 85,
    unallowedMappingFields: [],
    unallowedValueFields: ['event.category', 'event.outcome'],
  },
  rollup: {
    docsCount: 20,
    error: null,
    ilmExplain: {
      '.internal.alerts-security.alerts-default-000001': {
        index: '.internal.alerts-security.alerts-default-000001',
        managed: true,
        policy: '.alerts-ilm-policy',
        index_creation_date_millis: 1700757268526,
        time_since_index_creation: '20.99d',
        lifecycle_date_millis: 1700757268526,
        age: '20.99d',
        phase: 'hot',
        phase_time_millis: 1700757270294,
        action: 'rollover',
        action_time_millis: 1700757273955,
        step: 'check-rollover-ready',
        step_time_millis: 1700757273955,
        phase_execution: {
          policy: '.alerts-ilm-policy',
          phase_definition: {
            min_age: '0ms',
            actions: {
              rollover: {
                max_age: '30d',
                max_primary_shard_size: '50gb',
              },
            },
          },
          version: 1,
          modified_date_in_millis: 1700757266723,
        },
      },
    },
    ilmExplainPhaseCounts: {
      hot: 1,
      warm: 0,
      cold: 0,
      frozen: 0,
      unmanaged: 0,
    },
    indices: 1,
    pattern: '.alerts-security.alerts-default',
    results: {
      '.internal.alerts-security.alerts-default-000001': {
        docsCount: 20,
        error: null,
        ilmPhase: 'hot',
        incompatible: 2,
        indexName: '.internal.alerts-security.alerts-default-000001',
        markdownComments: [
          '### .internal.alerts-security.alerts-default-000001\n',
          '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | .internal.alerts-security.alerts-default-000001 | 20 (100,0 %) | 2 | `hot` | 494.6KB |\n\n',
          '### **Incompatible fields** `2` **Same family** `0` **Custom fields** `284` **ECS compliant fields** `1440` **All fields** `1726`\n',
          "#### 2 incompatible fields\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version 8.6.1.\n\n❌ Detection engine rules referencing these fields may not match them correctly\n❌ Pages may not display some events or fields due to unexpected field mappings or values\n❌ Mappings or field values that don't comply with ECS are not supported\n",
          '\n\n#### Incompatible field values - .internal.alerts-security.alerts-default-000001\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `behavior` (1) |\n| event.outcome | `failure`, `success`, `unknown` | `` (12) |\n\n',
        ],
        pattern: '.alerts-security.alerts-default',
        sameFamily: 0,
      },
    },
    sizeInBytes: 506471,
    stats: {
      '.internal.alerts-security.alerts-default-000001': {
        uuid: 'aO29KOwtQ3Snf-Pit5Wf4w',
        health: 'green',
        status: 'open',
      },
    },
  },
};
