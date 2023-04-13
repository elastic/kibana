/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import '@kbn/es-ui-shared-plugin/public/components/code_editor/jest_mock';
import { setupEnvironment, pageHelpers } from './helpers';
import { WatchCreateJsonTestBed } from './helpers/watch_create_json_page.helpers';
import { WATCH } from './helpers/jest_constants';

const { setup } = pageHelpers.watchCreateJsonPage;

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    // Mocking EuiCodeEditor, which uses React Ace under the hood
    EuiCodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj']}
        onChange={(syntheticEvent: any) => {
          props.onChange(syntheticEvent.jsonString);
        }}
      />
    ),
  };
});

describe('<JsonWatchEditPage /> create route', () => {
  let testBed: WatchCreateJsonTestBed;
  const { httpSetup } = setupEnvironment();

  describe('simulate flyout', () => {
    beforeEach(async () => {
      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

    describe('for any condition', () => {
      beforeEach(async () => {
        const { actions, form, component } = testBed;

        // Set watch id (required field) and switch to simulate tab
        form.setInputValue('idInput', WATCH.watch.id);
        actions.selectTab('simulate');
        await act(async () => {
          actions.clickSimulateButton();
        });
        component.update();
      });

      test('should set the correct flyout title', () => {
        const { find } = testBed;
        expect(find('simulateResultsFlyoutTitle').text()).toBe('Simulation results');
      });
    });

    describe('for condition that evaluates to true', () => {
      test('should set the correct condition met status', async () => {
        const { find, exists, actions, form, component } = testBed;

        // Set watch id (required field) and switch to simulate tab
        form.setInputValue('idInput', WATCH.watch.id);

        // Set json value with condition that always evaluates to true
        const jsonData = {
          trigger: {
            schedule: {
              interval: '30m',
            },
          },
          input: {
            search: {
              request: {
                body: {
                  size: 0,
                  query: {
                    match_all: {},
                  },
                },
                indices: ['*'],
              },
            },
          },
          condition: {
            always: {},
          },
          actions: {
            'my-logging-action': {
              logging: {
                text: 'Test.',
              },
            },
          },
        };

        await act(async () => {
          actions.setJsonField(jsonData);
        });
        component.update();

        console.log(find('jsonEditor').text());

        actions.selectTab('simulate');

        await act(async () => {
          actions.clickSimulateButton();
        });
        component.update();

        // const { exists } = testBed;
        expect(exists('conditionMetStatus')).toBe(true);
        expect(exists('conditionNotMetStatus')).toBe(false);
      });
    });

    describe('for condition that evaluates to false', () => {
      beforeEach(async () => {
        const { actions, form, component } = testBed;

        // Set watch id (required field) and switch to simulate tab
        form.setInputValue('idInput', WATCH.watch.id);
        actions.selectTab('simulate');

        await act(async () => {
          actions.clickSimulateButton();
        });
        component.update();
      });

      test('should set the correct condition not met status', () => {
        const { exists } = testBed;
        expect(exists('conditionMetStatus')).toBe(false);
        expect(exists('conditionNotMetStatus')).toBe(true);
      });
    });
  });
});
