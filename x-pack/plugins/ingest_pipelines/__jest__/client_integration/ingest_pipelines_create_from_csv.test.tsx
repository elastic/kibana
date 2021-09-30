/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { setupEnvironment, pageHelpers } from './helpers';
import { PipelineCreateFromCsvTestBed } from './helpers/pipelines_create_from_csv.helpers';

const { setup } = pageHelpers.pipelinesCreateFromCsv;

jest.mock('../../../../../../../../src/plugins/kibana_react/public', () => {
  const original = jest.requireActual('../../../../../../../../src/plugins/kibana_react/public');
  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: any) => {
          props.onChange(e.jsonContent);
        }}
      />
    ),
  };
});

describe('<PipelinesCreateFromCsv />', () => {
  const { server } = setupEnvironment();
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
        size: 100
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
      });

      test('should send the correct payload', async () => {
        const { actions } = testBed;

        actions.clickProcessCsv();

        const latestRequest = server.requests[server.requests.length - 1];

        const expected = {
          name: 'my_pipeline',
          description: 'pipeline description',
          processors: [],
        };

        expect(JSON.parse(JSON.parse(latestRequest.requestBody).body)).toEqual(expected);
      });

      test('should surface API errors from the request', async () => {
        
      });

      describe('result options', () => {
        test('continue to create', async () => {
          
        });
  
        test('copy to clipboard', async () => {
          
        });
  
        test('download', async () => {
          
        });
      });  
    });
  });
});
