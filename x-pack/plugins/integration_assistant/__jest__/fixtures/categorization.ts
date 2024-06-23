/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Pipeline } from '../../common';

export const categorizationInitialPipeline: Pipeline = {
  description: 'Pipeline to process mysql_enterprise audit logs',
  processors: [
    {
      set: {
        field: 'ecs.version',
        value: '8.11.0',
      },
    },
    {
      rename: {
        field: 'message',
        target_field: 'event.original',
        ignore_missing: true,
        if: 'ctx.event?.original == null',
      },
    },
    {
      remove: {
        field: 'event.original',
        tag: 'remove_original_event',
        if: 'ctx?.tags == null || !(ctx.tags.contains("preserve_original_event"))',
        ignore_failure: true,
        ignore_missing: true,
      },
    },
  ],
};

export const categorizationExpectedResults = {
  docs: [
    {
      key: 'value',
      anotherKey: 'anotherValue',
    },
  ],
  pipeline: {
    description: 'Pipeline to process mysql_enterprise audit logs',
    processors: [
      {
        set: {
          field: 'ecs.version',
          value: '8.11.0',
        },
      },
      {
        append: {
          field: 'event.type',
          value: ['change'],
          if: "ctx.mysql_enterprise?.audit?.general_data?.sql_command == 'create_db'",
        },
      },
      {
        append: {
          field: 'event.category',
          value: ['database'],
          if: "ctx.mysql_enterprise?.audit?.general_data?.sql_command == 'create_db'",
        },
      },
      {
        rename: {
          field: 'message',
          target_field: 'event.original',
          ignore_missing: true,
          if: 'ctx.event?.original == null',
        },
      },
      {
        remove: {
          field: 'event.original',
          tag: 'remove_original_event',
          if: 'ctx?.tags == null || !(ctx.tags.contains("preserve_original_event"))',
          ignore_failure: true,
          ignore_missing: true,
        },
      },
    ],
  },
};

export const categorizationInitialMockedResponse = [
  {
    append: {
      field: 'event.type',
      value: ['creation'],
      if: "ctx.mysql_enterprise?.audit?.general_data?.sql_command == 'create_db'",
    },
  },
  {
    append: {
      field: 'event.category',
      value: ['database'],
      if: "ctx.mysql_enterprise.audit.general_data.sql_command == 'create_db'",
    },
  },
];

export const categorizationErrorMockedResponse = [
  {
    append: {
      field: 'event.type',
      value: ['creation'],
      if: "ctx.mysql_enterprise?.audit?.general_data?.sql_command == 'create_db'",
    },
  },
  {
    append: {
      field: 'event.category',
      value: ['database'],
      if: "ctx.mysql_enterprise?.audit?.general_data?.sql_command == 'create_db'",
    },
  },
];

export const categorizationInvalidMockedResponse = [
  {
    append: {
      field: 'event.type',
      value: ['change'],
      if: "ctx.mysql_enterprise?.audit?.general_data?.sql_command == 'create_db'",
    },
  },
  {
    append: {
      field: 'event.category',
      value: ['database'],
      if: "ctx.mysql_enterprise?.audit?.general_data?.sql_command == 'create_db'",
    },
  },
];

export const categorizationReviewMockedResponse = [
  {
    append: {
      field: 'event.type',
      value: ['change'],
      if: "ctx.mysql_enterprise?.audit?.general_data?.sql_command == 'create_db'",
    },
  },
  {
    append: {
      field: 'event.category',
      value: ['database'],
      if: "ctx.mysql_enterprise?.audit?.general_data?.sql_command == 'create_db'",
    },
  },
];

export const testPipelineError: { pipelineResults: object[]; errors: object[] } = {
  pipelineResults: [],
  errors: [{ error: 'Sample error message 1' }, { error: 'Sample error message 2' }],
};

export const testPipelineValidResult: { pipelineResults: object[]; errors: object[] } = {
  pipelineResults: [{ key: 'value', anotherKey: 'anotherValue' }],
  errors: [],
};

export const testPipelineInvalidEcs: { pipelineResults: object[]; errors: object[] } = {
  pipelineResults: [
    { event: { type: ['database'], category: ['creation'] }, anotherKey: 'anotherValue' },
  ],
  errors: [],
};

export const categorizationTestState = {
  rawSamples: ['{"test1": "test1"}'],
  samples: ['{ "test1": "test1" }'],
  formattedSamples: '{"test1": "test1"}',
  ecsTypes: 'testtypes',
  ecsCategories: 'testcategories',
  exAnswer: 'testanswer',
  lastExecutedChain: 'testchain',
  packageName: 'testpackage',
  dataStreamName: 'testDataStream',
  errors: { test: 'testerror' },
  pipelineResults: [{ test: 'testresult' }],
  finalized: false,
  reviewed: false,
  currentPipeline: { test: 'testpipeline' },
  currentProcessors: [
    {
      append: {
        field: 'event.type',
        value: ['creation'],
        if: "ctx.mysql_enterprise?.audit?.general_data?.sql_command == 'create_db'",
      },
    },
    {
      append: {
        field: 'event.category',
        value: ['database'],
        if: "ctx.mysql_enterprise.audit.general_data.sql_command == 'create_db'",
      },
    },
  ],
  invalidCategorization: { test: 'testinvalid' },
  initialPipeline: categorizationInitialPipeline,
  results: { test: 'testresults' },
};

export const categorizationMockProcessors = [
  {
    append: {
      field: 'event.type',
      value: ['creation'],
      if: "ctx.mysql_enterprise?.audit?.general_data?.sql_command == 'create_db'",
    },
  },
  {
    append: {
      field: 'event.category',
      value: ['database'],
      if: "ctx.mysql_enterprise.audit.general_data.sql_command == 'create_db'",
    },
  },
];

export const categorizationExpectedHandlerResponse = {
  currentPipeline: {
    description: 'Pipeline to process mysql_enterprise audit logs',
    processors: [
      {
        set: {
          field: 'ecs.version',
          value: '8.11.0',
        },
      },
      {
        append: {
          field: 'event.type',
          value: ['creation'],
          if: "ctx.mysql_enterprise?.audit?.general_data?.sql_command == 'create_db'",
        },
      },
      {
        append: {
          field: 'event.category',
          value: ['database'],
          if: "ctx.mysql_enterprise.audit.general_data.sql_command == 'create_db'",
        },
      },
      {
        rename: {
          field: 'message',
          target_field: 'event.original',
          ignore_missing: true,
          if: 'ctx.event?.original == null',
        },
      },
      {
        remove: {
          field: 'event.original',
          tag: 'remove_original_event',
          if: 'ctx?.tags == null || !(ctx.tags.contains("preserve_original_event"))',
          ignore_failure: true,
          ignore_missing: true,
        },
      },
    ],
  },
  currentProcessors: [
    {
      append: {
        field: 'event.type',
        value: ['creation'],
        if: "ctx.mysql_enterprise?.audit?.general_data?.sql_command == 'create_db'",
      },
    },
    {
      append: {
        field: 'event.category',
        value: ['database'],
        if: "ctx.mysql_enterprise.audit.general_data.sql_command == 'create_db'",
      },
    },
  ],
  reviewed: false,
  lastExecutedChain: 'error',
};
