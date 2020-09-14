/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Pipeline } from '../../../../../common/types';

import { VerboseTestOutput, Document } from '../types';
import { setup, SetupResult, setupEnvironment } from './test_pipeline.helpers';
import { DOCUMENTS, SIMULATE_RESPONSE, PROCESSORS } from './constants';

interface ReqBody {
  documents: Document[];
  verbose?: boolean;
  pipeline: Pick<Pipeline, 'processors' | 'on_failure'>;
}

describe('Test pipeline', () => {
  let onUpdate: jest.Mock;
  let testBed: SetupResult;

  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    server.restore();
    jest.useRealTimers();
  });

  beforeEach(async () => {
    onUpdate = jest.fn();
    testBed = await setup({
      value: {
        ...PROCESSORS,
      },
      onFlyoutOpen: jest.fn(),
      onUpdate,
    });
  });

  describe('Test pipeline actions', () => {
    it('should successfully add sample documents and execute the pipeline', async () => {
      const { find, actions, exists } = testBed;

      httpRequestsMockHelpers.setSimulatePipelineResponse(SIMULATE_RESPONSE);

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
      actions.addDocumentsJson(JSON.stringify(DOCUMENTS));
      await actions.clickRunPipelineButton();

      // Verify request
      const latestRequest = server.requests[server.requests.length - 1];
      const requestBody: ReqBody = JSON.parse(JSON.parse(latestRequest.requestBody).body);
      const {
        documents: reqDocuments,
        verbose: reqVerbose,
        pipeline: { processors: reqProcessors },
      } = requestBody;

      expect(reqDocuments).toEqual(DOCUMENTS);
      expect(reqVerbose).toEqual(true);

      // We programatically add a unique tag field when calling the simulate API
      // We do not know this value in the test, so we simply check that the field exists
      // and only verify the processor configuration
      reqProcessors.forEach((processor, index) => {
        Object.entries(processor).forEach(([key, value]) => {
          const { tag, ...config } = value;
          expect(tag).toBeDefined();
          expect(config).toEqual(PROCESSORS.processors[index][key]);
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
      expect(server.requests[server.requests.length - 1].url).toBe(
        '/api/ingest_pipelines/simulate'
      );

      // Click verbose toggle and verify request
      await actions.toggleVerboseSwitch();
      expect(server.requests.length).toBe(totalRequests + 2);
      expect(server.requests[server.requests.length - 1].url).toBe(
        '/api/ingest_pipelines/simulate'
      );
    });

    test('should enable the output tab if cached documents exist', async () => {
      const { actions, exists } = testBed;

      httpRequestsMockHelpers.setSimulatePipelineResponse(SIMULATE_RESPONSE);

      // Open flyout
      actions.clickAddDocumentsButton();

      // Add sample documents and click run
      actions.addDocumentsJson(JSON.stringify(DOCUMENTS));
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

      // Verify error rendered
      expect(exists('pipelineExecutionError')).toBe(true);
      expect(find('pipelineExecutionError').text()).toContain(error.message);
    });
  });

  describe('Processors', () => {
    // This is a hack
    // We need to provide the processor id in the mocked output;
    // this is generated dynamically and not something we can stub.
    // As a workaround, the value is added as a data attribute in the UI
    // and we retrieve it to generate the mocked output.
    const addProcessorTagtoMockOutput = (output: VerboseTestOutput) => {
      const { find } = testBed;

      const docs = output.docs.map((doc) => {
        const results = doc.processor_results.map((result, index) => {
          const tag = find(`processors>${index}`).props()['data-processor-id'];
          return {
            ...result,
            tag,
          };
        });
        return { processor_results: results };
      });
      return { docs };
    };

    it('should show "inactive" processor status by default', async () => {
      const { find } = testBed;

      const statusIconLabel = find('processors>0.processorStatusIcon').props()['aria-label'];

      expect(statusIconLabel).toEqual('Not run');
    });

    it('should update the processor status after execution', async () => {
      const { actions, find } = testBed;

      const mockVerboseOutputWithProcessorTag = addProcessorTagtoMockOutput(SIMULATE_RESPONSE);
      httpRequestsMockHelpers.setSimulatePipelineResponse(mockVerboseOutputWithProcessorTag);

      // Open flyout
      actions.clickAddDocumentsButton();

      // Add sample documents and click run
      actions.addDocumentsJson(JSON.stringify(DOCUMENTS));
      await actions.clickRunPipelineButton();
      actions.closeTestPipelineFlyout();

      // Verify status
      const statusIconLabel = find('processors>0.processorStatusIcon').props()['aria-label'];
      expect(statusIconLabel).toEqual('Success');
    });

    describe('Output tab', () => {
      beforeEach(async () => {
        const { actions } = testBed;

        const mockVerboseOutputWithProcessorTag = addProcessorTagtoMockOutput(SIMULATE_RESPONSE);
        httpRequestsMockHelpers.setSimulatePipelineResponse(mockVerboseOutputWithProcessorTag);

        // Add documents and run the pipeline
        actions.clickAddDocumentsButton();
        actions.addDocumentsJson(JSON.stringify(DOCUMENTS));
        await actions.clickRunPipelineButton();
        actions.closeTestPipelineFlyout();
      });

      it('should show the output of the processor', async () => {
        const { actions, exists } = testBed;

        // Click processor to open manage flyout
        await actions.clickProcessor('processors>0');
        // Verify flyout opened
        expect(exists('processorSettingsForm')).toBe(true);

        // Navigate to "Output" tab
        actions.clickProcessorOutputTab();
        // Verify content
        expect(exists('processorOutputTabContent')).toBe(true);
      });
    });
  });
});
