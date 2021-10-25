/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { API_BASE_PATH } from '../../common/constants';

import { setupEnvironment, pageHelpers } from './helpers';
import { PipelineCreateFromCsvTestBed } from './helpers/pipelines_create_from_csv.helpers';

const { setup } = pageHelpers.pipelinesCreateFromCsv;

describe('<PipelinesCreateFromCsv />', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: PipelineCreateFromCsvTestBed;

  afterAll(() => {
    server.restore();
  });

  beforeEach(async () => {
    await act(async () => {
      testBed = await setup();
    });

    testBed.component.update();
  });

  describe('on component mount', () => {
    test('should render the correct page header and documentation link', () => {
      const { exists, find } = testBed;

      expect(exists('pageTitle')).toBe(true);
      expect(find('pageTitle').text()).toEqual('Create new pipeline from CSV');

      expect(exists('documentationLink')).toBe(true);
      expect(find('documentationLink').text()).toBe('Create pipeline docs');
    });

    describe('form validation', () => {
      test('should prevent form submission if file for upload is missing', async () => {
        const { component, find, actions } = testBed;

        expect(find('processFileButton').props().disabled).toEqual(true);

        actions.selectCsvForUpload();
        component.update();

        expect(find('processFileButton').props().disabled).toEqual(false);
      });
    });

    describe('form submission', () => {
      const mockFile = {
        name: 'foo.csv',
        path: '/home/foo.csv',
        size: 100,
      } as unknown as File;

      beforeEach(async () => {
        await act(async () => {
          testBed = await setup();
        });

        testBed.component.update();

        await act(async () => {
          testBed.actions.selectCsvForUpload(mockFile);
        });

        testBed.component.update();

        httpRequestsMockHelpers.setMapToPipelineResponse({}, undefined);
      });

      test('should map pipeline from file upload', async () => {
        const { actions } = testBed;
        const totalRequests = server.requests.length;

        await act(async () => {
          actions.clickProcessCsv();
        });

        expect(server.requests.length).toBe(totalRequests + 1);
        expect(server.requests[server.requests.length - 1].url).toBe(`${API_BASE_PATH}/parse_csv`);
      });

      test('should render an error message if error mapping pipeline', async () => {
        const { actions, find, exists } = testBed;

        const errorTitle = 'title';
        const errorDetails = 'helpful description';

        const error = {
          status: 400,
          error: 'Bad Request',
          message: `${errorTitle}:${errorDetails}`,
        };

        httpRequestsMockHelpers.setMapToPipelineResponse(undefined, { body: error });

        actions.selectCsvForUpload(mockFile);
        await actions.clickProcessCsv();

        expect(exists('errorCallout')).toBe(true);
        expect(find('errorCallout').text()).toContain(errorTitle);
        expect(find('errorCallout').text()).toContain(errorDetails);
      });

      describe('results', () => {
        beforeEach(async () => {
          await act(async () => {
            testBed = await setup();
          });

          testBed.component.update();
        });

        test('result buttons', async () => {
          const { exists, find } = testBed;

          await testBed.actions.uploadFile(mockFile);

          expect(exists('pipelineMappingsJSONEditor')).toBe(true);

          expect(exists('continueToCreate')).toBe(true);
          expect(find('continueToCreate').text()).toContain(
            'Continue to create ingest node pipeline'
          );

          expect(exists('copyToClipboard')).toBe(true);
          expect(find('copyToClipboard').text()).toContain('Copy JSON to clipboard');

          expect(exists('downloadJson')).toBe(true);
          expect(find('downloadJson').text()).toContain('Download JSON');
        });
      });
    });
  });
});
