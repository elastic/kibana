/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { API_BASE_PATH } from '../../common/constants';

import { setupEnvironment, pageHelpers } from './helpers';
import { PipelineCreateFromCsvTestBed } from './helpers/pipelines_create_from_csv.helpers';

const { setup } = pageHelpers.pipelinesCreateFromCsv;

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    EuiFilePicker: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockFilePicker'}
        onChange={(syntheticEvent: any) => {
          props.onChange(syntheticEvent.files);
        }}
      />
    ),
  };
});

jest.mock('../../../../../src/plugins/kibana_react/public', () => {
  const original = jest.requireActual('../../../../../src/plugins/kibana_react/public');

  return {
    ...original,
    CodeEditorField: (props: any) => (
      <p data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}>{props.value}</p>
    ),
  };
});

describe('<PipelinesCreateFromCsv />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: PipelineCreateFromCsvTestBed;

  beforeEach(async () => {
    await act(async () => {
      testBed = await setup(httpSetup);
    });

    testBed.component.update();
  });

  describe('on component mount', () => {
    test('should render the correct page header and documentation link', () => {
      const { exists, find } = testBed;

      expect(exists('pageTitle')).toBe(true);
      expect(find('pageTitle').text()).toEqual('Create pipeline from CSV');

      expect(exists('documentationLink')).toBe(true);
      expect(find('documentationLink').text()).toBe('CSV to pipeline docs');
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
      const fileContent = 'Mock file content';

      const mockFile = {
        name: 'foo.csv',
        text: () => Promise.resolve(fileContent),
        size: fileContent.length,
      } as File;

      const parsedCsv = {
        processors: [
          {
            set: {
              field: 'foo',
              if: 'ctx.bar != null',
              value: '{{bar}}',
            },
          },
        ],
      };

      beforeEach(async () => {
        await act(async () => {
          testBed = await setup(httpSetup);
        });

        testBed.component.update();

        testBed.actions.selectCsvForUpload(mockFile);

        testBed.component.update();

        httpRequestsMockHelpers.setParseCsvResponse(parsedCsv, undefined);
      });

      test('should parse csv from file upload', async () => {
        const { actions, find } = testBed;

        await actions.clickProcessCsv();

        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/parse_csv`,
          expect.objectContaining({
            body: JSON.stringify({
              file: fileContent,
              copyAction: 'copy',
            }),
          })
        );

        expect(JSON.parse(find('pipelineMappingsJSONEditor').text())).toEqual(parsedCsv);
      });

      test('should render an error message if error mapping pipeline', async () => {
        const { actions, find, exists } = testBed;

        const errorTitle = 'title';
        const errorDetails = 'helpful description';

        const error = {
          statusCode: 400,
          error: 'Bad Request',
          message: `${errorTitle}:${errorDetails}`,
        };

        httpRequestsMockHelpers.setParseCsvResponse(undefined, error);

        actions.selectCsvForUpload(mockFile);
        await actions.clickProcessCsv();

        expect(exists('errorCallout')).toBe(true);
        expect(find('errorCallout').text()).toContain(errorTitle);
        expect(find('errorCallout').text()).toContain(errorDetails);
      });

      describe('results', () => {
        beforeEach(async () => {
          await act(async () => {
            testBed = await setup(httpSetup);
          });

          testBed.component.update();
        });

        test('result buttons', async () => {
          const { exists, find } = testBed;

          await testBed.actions.uploadFile(mockFile);

          expect(exists('pipelineMappingsJSONEditor')).toBe(true);

          expect(exists('continueToCreate')).toBe(true);
          expect(find('continueToCreate').text()).toContain('Continue to create pipeline');

          expect(exists('copyToClipboard')).toBe(true);
          expect(find('copyToClipboard').text()).toContain('Copy JSON');

          expect(exists('downloadJson')).toBe(true);
          expect(find('downloadJson').text()).toContain('Download JSON');
        });
      });
    });
  });
});
