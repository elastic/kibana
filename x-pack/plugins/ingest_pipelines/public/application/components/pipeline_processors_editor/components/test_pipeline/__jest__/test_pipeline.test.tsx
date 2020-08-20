/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Pipeline } from '../../../../../../../common/types';

import { VerboseTestOutput, Document } from '../../../types';
import { setup, SetupResult } from './test_pipeline.helpers';
import { initHttpRequests } from './http_requests.helpers';

interface ReqBody {
  documents: Document[];
  verbose?: boolean;
  pipeline: Pick<Pipeline, 'processors' | 'on_failure'>;
}

const mockProcessors: Pick<Pipeline, 'processors'> = {
  processors: [
    {
      set: {
        field: 'field1',
        value: 'value1',
      },
    },
  ],
};

const mockDocuments: Document[] = [
  {
    _index: 'index',
    _id: 'id1',
    _source: {
      name: 'foo',
    },
  },
  {
    _index: 'index',
    _id: 'id2',
    _source: {
      name: 'bar',
    },
  },
];

const mockVerboseOutput: VerboseTestOutput = {
  docs: [
    {
      processor_results: [
        {
          processor_type: 'set',
          status: 'success',
          tag: 'some_tag',
          doc: {
            _index: 'index',
            _id: 'id1',
            _source: {
              name: 'foo',
              foo: 'bar',
            },
          },
        },
      ],
    },
    {
      processor_results: [
        {
          processor_type: 'set',
          status: 'success',
          tag: 'some_tag',
          doc: {
            _index: 'index',
            _id: 'id2',
            _source: {
              name: 'bar',
              foo: 'bar',
            },
          },
        },
      ],
    },
  ],
};

describe('Test pipeline', () => {
  let onUpdate: jest.Mock;
  let testBed: SetupResult;

  const { server, httpRequestsMockHelpers } = initHttpRequests();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
    server.restore();
  });

  beforeEach(async () => {
    onUpdate = jest.fn();
    testBed = await setup({
      value: {
        ...mockProcessors,
      },
      onFlyoutOpen: jest.fn(),
      onUpdate,
    });
  });

  it('should successfully add sample documents and execute the pipeline', async () => {
    const { find, actions, exists } = testBed;

    httpRequestsMockHelpers.setSimulatePipelineResponse(mockVerboseOutput);

    // Flyout and document dropdown should not be visible
    expect(exists('testPipelineFlyout')).toBe(false);
    expect(exists('documentsDropdown')).toBe(false);

    // Open flyout
    actions.clickAddDocumentsButton();

    // Flyout should be visible with output tab initially disabled
    expect(exists('testPipelineFlyout')).toBe(true);
    expect(exists('documentsTabContent')).toBe(true);
    expect(exists('outputTabContent')).toBe(false);
    expect(find('outputTab').props().disabled).toEqual(true);

    // Add sample documents and click run
    actions.addDocumentsJson(JSON.stringify(mockDocuments));
    await actions.clickRunPipelineButton();

    // Verify request
    const latestRequest = server.requests[server.requests.length - 1];
    const requestBody: ReqBody = JSON.parse(JSON.parse(latestRequest.requestBody).body);
    const {
      documents: reqDocuments,
      verbose: reqVerbose,
      pipeline: { processors: reqProcessors },
    } = requestBody;

    expect(reqDocuments).toEqual(mockDocuments);
    expect(reqVerbose).toEqual(true);

    // We programatically add a unique tag field when calling the simulate API
    // We do not know this value in the test, so we simply check that the field exists
    // and only verify the processor configuration
    reqProcessors.forEach((processor, index) => {
      Object.entries(processor).forEach(([key, value]) => {
        const { tag, ...config } = value;
        expect(tag).toBeDefined();
        expect(config).toEqual(mockProcessors.processors[index][key]);
      });
    });

    // Verify output tab is active
    expect(find('outputTab').props().disabled).toEqual(false);
    expect(exists('documentsTabContent')).toBe(false);
    expect(exists('outputTabContent')).toBe(true);

    // Click reload button and verify request
    const totalRequests = server.requests.length;

    await actions.clickRefreshOutputButton();

    expect(server.requests.length).toBe(totalRequests + 1);
    expect(server.requests[server.requests.length - 1].url).toBe('/api/ingest_pipelines/simulate');

    // Click verbose toggle and verify request
    await actions.toggleVerboseSwitch();

    expect(server.requests.length).toBe(totalRequests + 2);
    expect(server.requests[server.requests.length - 1].url).toBe('/api/ingest_pipelines/simulate');
  });

  test('should enable the output tab if cached documents exist', async () => {
    const { actions, exists } = testBed;

    httpRequestsMockHelpers.setSimulatePipelineResponse(mockVerboseOutput);

    // Open flyout
    actions.clickAddDocumentsButton();

    // Add sample documents and click run
    actions.addDocumentsJson(JSON.stringify(mockDocuments));
    await actions.clickRunPipelineButton();

    // Close flyout
    actions.closeTestPipelineFlyout();
    expect(exists('testPipelineFlyout')).toBe(false);
    expect(exists('addDocumentsButton')).toBe(false);
    expect(exists('documentsDropdown')).toBe(true);

    // Reopen flyout and verify output tab is enabled
    await actions.clickViewOutputButton();
    expect(exists('testPipelineFlyout')).toBe(true);
    expect(exists('documentsTabContent')).toBe(false);
    expect(exists('outputTabContent')).toBe(true);
  });

  test('should surface API errors from the request', async () => {
    const { actions, find, exists } = testBed;

    const error = {
      status: 400,
      error: 'Bad Request',
      message:
        '"[parse_exception] [_source] required property is missing, with { property_name="_source" }"',
    };

    httpRequestsMockHelpers.setSimulatePipelineResponse(undefined, { body: error });

    // Open flyout
    actions.clickAddDocumentsButton();

    // Add invalid sample documents array and run the pipeline
    actions.addDocumentsJson(JSON.stringify([{}]));
    await actions.clickRunPipelineButton();

    expect(exists('pipelineExecutionError')).toBe(true);
    expect(find('pipelineExecutionError').text()).toContain(error.message);
  });
});
