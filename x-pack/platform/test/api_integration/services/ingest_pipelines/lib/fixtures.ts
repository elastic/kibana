/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IngestProcessorContainer,
  VersionNumber,
  Metadata,
  IngestPutPipelineRequest,
} from '@elastic/elasticsearch/lib/api/types';

export interface Pipeline {
  name: string;
  description?: string;
  onFailureProcessors?: IngestProcessorContainer[];
  processors: IngestProcessorContainer[];
  version?: VersionNumber;
  metadata?: Metadata;
}

export interface IngestPutPipelineInternalRequest extends Omit<IngestPutPipelineRequest, 'id'> {
  name: string;
}

export function IngestPipelinesFixturesProvider() {
  const defaultProcessors: IngestProcessorContainer[] = [
    {
      script: {
        source: 'ctx._type = null',
      },
    },
  ];

  const defaultOnFailureProcessors: IngestProcessorContainer[] = [
    {
      set: {
        field: 'error.message',
        value: '{{ failure_message }}',
      },
    },
  ];

  const defaultMetadata: Metadata = {
    field_1: 'test',
    field_2: 10,
  };

  const apiBasePath = '/api/ingest_pipelines';

  const createPipelineBodyWithRequiredFields = (): IngestPutPipelineInternalRequest => {
    return {
      name: `test-pipeline-required-fields-${Math.random()}`,
      processors: defaultProcessors,
    };
  };

  const createPipelineBody = (pipeline?: Pipeline): IngestPutPipelineInternalRequest => {
    if (pipeline) {
      const { name, description, processors, onFailureProcessors, version, metadata } = pipeline;
      return {
        name,
        description,
        processors,
        on_failure: onFailureProcessors,
        version,
        _meta: metadata,
      };
    }

    // Use default payload if none is provided
    return {
      name: `test-pipeline-${Math.random()}`,
      description: 'test pipeline description',
      processors: defaultProcessors,
      on_failure: defaultOnFailureProcessors,
      version: 1,
      _meta: defaultMetadata,
    };
  };

  const createDocuments = () => {
    return [
      {
        _index: 'index',
        _id: 'id1',
        _source: {
          foo: 'bar',
        },
      },
      {
        _index: 'index',
        _id: 'id2',
        _source: {
          foo: 'rab',
        },
      },
    ];
  };

  return {
    createPipelineBodyWithRequiredFields,
    createPipelineBody,
    createDocuments,
    apiBasePath,
  };
}
