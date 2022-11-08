/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Pipeline } from '../../../../../common/types';
import { API_BASE_PATH } from '../../../../../common/constants';

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

  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  // This is a hack
  // We need to provide the processor id in the mocked output;
  // this is generated dynamically
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

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    onUpdate = jest.fn();
    testBed = await setup(httpSetup, {
      value: {
        ...PROCESSORS,
      },
      onFlyoutOpen: jest.fn(),
      onUpdate,
    });
  });

  describe('Test pipeline actions', () => {
    it('should successfully add sample documents and execute the pipeline', async () => {
      const { actions, exists } = testBed;

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

      // Add sample documents and click run
      actions.addDocumentsJson(JSON.stringify(DOCUMENTS));
      await actions.clickRunPipelineButton();

      // Verify request
      const latestRequest: any = httpSetup.post.mock.calls.pop() || [];
      const requestBody: ReqBody = JSON.parse(latestRequest[1]?.body);

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
      expect(exists('documentsTabContent')).toBe(false);
      expect(exists('outputTabContent')).toBe(true);

      // Click reload button and verify request
      await actions.clickRefreshOutputButton();
      // There will be two requests made to the simulate API
      // the second request will have verbose enabled to update the processor results
      expect(httpSetup.post).toHaveBeenNthCalledWith(
        1,
        `${API_BASE_PATH}/simulate`,
        expect.anything()
      );
      expect(httpSetup.post).toHaveBeenNthCalledWith(
        2,
        `${API_BASE_PATH}/simulate`,
        expect.anything()
      );

      // Click verbose toggle and verify request
      await actions.toggleVerboseSwitch();
      // There will be one request made to the simulate API
      expect(httpSetup.post).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/simulate`,
        expect.anything()
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
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      httpRequestsMockHelpers.setSimulatePipelineResponse(undefined, error);

      // Open flyout
      actions.clickAddDocumentsButton();

      // Add invalid sample documents array and run the pipeline
      actions.addDocumentsJson(
        JSON.stringify([
          {
            _index: 'test',
            _id: '1',
            _version: 1,
            _seq_no: 0,
            _primary_term: 1,
            _source: {
              name: 'John Doe',
            },
          },
        ])
      );
      await actions.clickRunPipelineButton();

      // Verify error rendered
      expect(exists('pipelineExecutionError')).toBe(true);
      expect(find('pipelineExecutionError').text()).toContain(error.message);
    });

    describe('Add indexed documents', () => {
      test('should successfully add an indexed document', async () => {
        const { actions, form, exists } = testBed;

        const { _index: index, _id: documentId } = DOCUMENTS[0];

        httpRequestsMockHelpers.setFetchDocumentsResponse(index, documentId, DOCUMENTS[0]);

        // Open flyout
        actions.clickAddDocumentsButton();

        // Open documents accordion, click run without required fields, and verify error messages
        await actions.toggleDocumentsAccordion();
        await actions.clickAddDocumentButton();
        expect(form.getErrorsMessages()).toEqual([
          'An index name is required.',
          'A document ID is required.',
        ]);

        // Add required fields, and click run
        form.setInputValue('indexField.input', index);
        form.setInputValue('idField.input', documentId);
        await actions.clickAddDocumentButton();

        // Verify request
        expect(httpSetup.get).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/documents/${index}/${documentId}`,
          expect.anything()
        );
        // Verify success callout
        expect(exists('addDocumentSuccess')).toBe(true);
      });

      test('should surface API errors from the request', async () => {
        const { actions, form, exists, find } = testBed;

        const nonExistentDoc = {
          index: 'foo',
          id: '1',
        };

        const error = {
          statusCode: 404,
          error: 'Not found',
          message: '[index_not_found_exception] no such index',
        };

        httpRequestsMockHelpers.setFetchDocumentsResponse(
          nonExistentDoc.index,
          nonExistentDoc.id,
          undefined,
          error
        );

        // Open flyout
        actions.clickAddDocumentsButton();

        // Open documents accordion, add required fields, and click run
        await actions.toggleDocumentsAccordion();
        form.setInputValue('indexField.input', nonExistentDoc.index);
        form.setInputValue('idField.input', nonExistentDoc.id);
        await actions.clickAddDocumentButton();

        // Verify error rendered
        expect(exists('addDocumentError')).toBe(true);
        expect(exists('addDocumentSuccess')).toBe(false);
        expect(find('addDocumentError').text()).toContain(error.message);
      });
    });

    describe('Documents dropdown', () => {
      beforeEach(async () => {
        const { actions } = testBed;

        httpRequestsMockHelpers.setSimulatePipelineResponse(
          addProcessorTagtoMockOutput(SIMULATE_RESPONSE)
        );

        // Open flyout
        actions.clickAddDocumentsButton();
        // Add sample documents and click run
        actions.addDocumentsJson(JSON.stringify(DOCUMENTS));
        await actions.clickRunPipelineButton();
        // Close flyout
        actions.closeTestPipelineFlyout();
      });

      it('should open flyout to edit documents', () => {
        const { exists, actions } = testBed;

        // Dropdown should be visible
        expect(exists('documentsDropdown')).toBe(true);

        // Open dropdown and edit documents
        actions.clickDocumentsDropdown();
        actions.clickEditDocumentsButton();

        // Flyout should be visible with "Documents" tab enabled
        expect(exists('testPipelineFlyout')).toBe(true);
        expect(exists('documentsTabContent')).toBe(true);
      });

      it('should clear all documents and stop pipeline simulation', async () => {
        const { exists, actions, find } = testBed;

        // Dropdown should be visible and processor status should equal "success"
        expect(exists('documentsDropdown')).toBe(true);
        const initialProcessorStatusLabel = find('processors>0.processorStatusIcon').props()[
          'aria-label'
        ];
        expect(initialProcessorStatusLabel).toEqual('Success');

        // Open flyout and click clear all button
        actions.clickDocumentsDropdown();
        actions.clickEditDocumentsButton();
        actions.clickClearAllButton();

        // Verify modal
        const modal = document.body.querySelector(
          '[data-test-subj="resetDocumentsConfirmationModal"]'
        );

        expect(modal).not.toBe(null);
        expect(modal!.textContent).toContain('Clear documents');

        // Confirm reset and close modal
        await actions.clickConfirmResetButton();

        // Verify documents and processors were reset
        expect(exists('documentsDropdown')).toBe(false);
        expect(exists('addDocumentsButton')).toBe(true);
        const resetProcessorStatusIconLabel = find('processors>0.processorStatusIcon').props()[
          'aria-label'
        ];
        expect(resetProcessorStatusIconLabel).toEqual('Not run');
      });
    });
  });

  describe('Processors', () => {
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

    describe('Configuration tab', () => {
      it('should not clear up form when clicking configuration tab', async () => {
        const { actions, find, exists } = testBed;

        // Click processor to open manage flyout
        await actions.clickProcessor('processors>0');
        // Verify flyout opened
        expect(exists('editProcessorForm')).toBe(true);
        // Click the "Configuration" tab
        await actions.clickProcessorConfigurationTab();
        // Verify type selector has not changed
        expect(find('processorTypeSelector.input').text()).toBe('Set');
      });
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
        expect(exists('editProcessorForm')).toBe(true);

        // Navigate to "Output" tab
        await actions.clickProcessorOutputTab();
        // Verify content
        expect(exists('processorOutputTabContent')).toBe(true);
      });
    });
  });
});
