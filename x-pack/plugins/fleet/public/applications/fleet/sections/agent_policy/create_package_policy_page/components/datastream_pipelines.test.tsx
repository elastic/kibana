/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createFleetTestRendererMock } from '../../../../../../mock';
import { useGetPipeline } from '../../../../hooks';

import { PackagePolicyEditorDatastreamPipelines } from './datastream_pipelines';

const mockedUseGetPipeline = useGetPipeline as jest.MockedFunction<typeof useGetPipeline>;

jest.mock('../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../hooks'),
    useGetPipeline: jest.fn(),
  };
});

describe('DatastreamPipelines', () => {
  it('should render with a add button if there is no custom pipeline', () => {
    const renderer = createFleetTestRendererMock();
    mockedUseGetPipeline.mockReturnValue({
      isLoading: false,
      error: {
        statusCode: 404,
      },
    } as any);

    const result = renderer.render(
      <PackagePolicyEditorDatastreamPipelines
        packageInputStream={{ data_stream: { dataset: 'test', type: 'logs' } }}
        packageInfo={
          {
            version: '1.0.0',
          } as any
        }
      />
    );

    expect(result.queryByTestId('datastreamAddCustomIngestPipelineBtn')).not.toBeNull();
    expect(result.queryAllByTestId('datastreamInspectPipelineBtn')).toHaveLength(1);
    expect(result.queryAllByTestId('datastreamEditPipelineBtn')).toHaveLength(0);
  });

  it('should render without a add button if there is a pipeline', () => {
    const renderer = createFleetTestRendererMock();
    mockedUseGetPipeline.mockReturnValue({
      isLoading: false,
      data: {
        name: 'test',
      },
    } as any);

    const result = renderer.render(
      <PackagePolicyEditorDatastreamPipelines
        packageInputStream={{ data_stream: { dataset: 'test', type: 'logs' } }}
        packageInfo={
          {
            version: '1.0.0',
          } as any
        }
      />
    );

    expect(result.queryByTestId('datastreamAddCustomIngestPipelineBtn')).toBeNull();
    expect(result.queryAllByTestId('datastreamInspectPipelineBtn')).toHaveLength(2);
    expect(result.queryAllByTestId('datastreamEditPipelineBtn')).toHaveLength(1);
  });
});
