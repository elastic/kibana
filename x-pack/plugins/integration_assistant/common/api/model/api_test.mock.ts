/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyzeLogsRequestBody } from '../analyze_logs/analyze_logs_route.gen';
import type { BuildIntegrationRequestBody } from '../build_integration/build_integration.gen';
import type { CategorizationRequestBody } from '../categorization/categorization_route.gen';
import type { CelInputRequestBody } from '../cel/cel_input_route.gen';
import type { EcsMappingRequestBody } from '../ecs/ecs_route.gen';
import type { RelatedRequestBody } from '../related/related_route.gen';
import type { DataStream, Integration, Pipeline } from './common_attributes.gen';

const rawSamples = ['{"test1": "test1"}'];

export const getDataStreamMock = (): DataStream => ({
  description: 'Test description',
  name: 'Test name',
  inputTypes: ['filestream'],
  title: 'Test title',
  docs: [
    {
      key: 'value',
      anotherKey: 'anotherValue',
    },
  ],
  rawSamples,
  pipeline: getPipelineMock(),
  samplesFormat: { name: 'ndjson', multiline: false },
});

export const getIntegrationMock = (): Integration => ({
  description: 'Test description',
  name: 'Test name',
  title: 'Test title',
  dataStreams: [getDataStreamMock()],
});

export const getPipelineMock = (): Pipeline => ({
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
  ],
});

export const getCategorizationRequestMock = (): CategorizationRequestBody => ({
  connectorId: 'test-connector-id',
  currentPipeline: getPipelineMock(),
  dataStreamName: 'test-data-stream-name',
  packageName: 'test-package-name',
  rawSamples,
  samplesFormat: { name: 'ndjson' },
});

export const getCelRequestMock = (): CelInputRequestBody => ({
  dataStreamName: 'test-data-stream-name',
  apiDefinition: 'test-api-definition',
  connectorId: 'test-connector-id',
});

export const getBuildIntegrationRequestMock = (): BuildIntegrationRequestBody => ({
  integration: getIntegrationMock(),
});

export const getEcsMappingRequestMock = (): EcsMappingRequestBody => ({
  rawSamples,
  dataStreamName: 'test-data-stream-name',
  packageName: 'test-package-name',
  connectorId: 'test-connector-id',
  samplesFormat: { name: 'json', multiline: false },
});

export const getRelatedRequestMock = (): RelatedRequestBody => ({
  dataStreamName: 'test-data-stream-name',
  packageName: 'test-package-name',
  rawSamples,
  connectorId: 'test-connector-id',
  currentPipeline: getPipelineMock(),
  samplesFormat: { name: 'structured', multiline: false },
});

export const getAnalyzeLogsRequestBody = (): AnalyzeLogsRequestBody => ({
  dataStreamName: 'test-data-stream-name',
  packageName: 'test-package-name',
  connectorId: 'test-connector-id',
  logSamples: rawSamples,
});
