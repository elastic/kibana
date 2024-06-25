/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuildIntegrationRequestBody } from '../build_integration/build_integration';
import type { CategorizationRequestBody } from '../categorization/categorization_route';
import type { EcsMappingRequestBody } from '../ecs/ecs_route';
import type { RelatedRequestBody } from '../related/related_route';
import type { DataStream, Integration, Pipeline } from './common_attributes';

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
});

export const getBuildIntegrationRequestMock = (): BuildIntegrationRequestBody => ({
  integration: getIntegrationMock(),
});

export const getEcsMappingRequestMock = (): EcsMappingRequestBody => ({
  rawSamples,
  dataStreamName: 'test-data-stream-name',
  packageName: 'test-package-name',
  connectorId: 'test-connector-id',
});

export const getRelatedRequestMock = (): RelatedRequestBody => ({
  dataStreamName: 'test-data-stream-name',
  packageName: 'test-package-name',
  rawSamples,
  connectorId: 'test-connector-id',
  currentPipeline: getPipelineMock(),
});
