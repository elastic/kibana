/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment, pageHelpers, nextTick, wrapBodyResponse } from './helpers';
import { WatchCreateJsonTestBed } from './helpers/watch_create_json.helpers';
import { WATCH } from './helpers/constants';
import defaultWatchJson from '../../public/application/models/watch/default_watch.json';
import { getExecuteDetails } from '../../test/fixtures';

const { setup } = pageHelpers.watchCreateJson;

describe('<JsonWatchEdit /> create route', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: WatchCreateJsonTestBed;

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      testBed = await setup();

      await act(async () => {
        const { component } = testBed;
        await nextTick();
        component.update();
      });
    });

    test('should set the correct page title', () => {
      const { find } = testBed;
      expect(find('pageTitle').text()).toBe('Create advanced watch');
    });

    describe('tabs', () => {
      test('should have 2 tabs', () => {
        const { find } = testBed;

        expect(find('tab').length).toBe(2);
        expect(find('tab').map((t) => t.text())).toEqual(['Edit', 'Simulate']);
      });

      test('should navigate to the "Simulate" tab', () => {
        const { exists, actions } = testBed;

        expect(exists('jsonWatchForm')).toBe(true);
        expect(exists('jsonWatchSimulateForm')).toBe(false);

        actions.selectTab('simulate');

        expect(exists('jsonWatchForm')).toBe(false);
        expect(exists('jsonWatchSimulateForm')).toBe(true);
      });
    });

    describe('create', () => {
      describe('form validation', () => {
        test('should not allow empty ID field', () => {
          const { form, actions } = testBed;
          form.setInputValue('idInput', '');

          actions.clickSubmitButton();

          expect(form.getErrorsMessages()).toContain('ID is required');
        });
        test('should not allow invalid characters for ID field', () => {
          const { form, actions } = testBed;
          form.setInputValue('idInput', 'invalid$id*field/');

          actions.clickSubmitButton();

          expect(form.getErrorsMessages()).toContain(
            'ID can only contain letters, underscores, dashes, periods and numbers.'
          );
        });
      });

      describe('form payload & API errors', () => {
        test('should send the correct payload', async () => {
          const { form, actions } = testBed;
          const { watch } = WATCH;

          form.setInputValue('nameInput', watch.name);
          form.setInputValue('idInput', watch.id);

          await act(async () => {
            actions.clickSubmitButton();
            await nextTick();
          });

          const latestRequest = server.requests[server.requests.length - 1];

          const DEFAULT_LOGGING_ACTION_ID = 'logging_1';
          const DEFAULT_LOGGING_ACTION_TYPE = 'logging';
          const DEFAULT_LOGGING_ACTION_TEXT =
            'There are {{ctx.payload.hits.total}} documents in your index. Threshold is 10.';

          expect(latestRequest.requestBody).toEqual(
            wrapBodyResponse({
              id: watch.id,
              name: watch.name,
              type: watch.type,
              isNew: true,
              isActive: true,
              actions: [
                {
                  id: DEFAULT_LOGGING_ACTION_ID,
                  type: DEFAULT_LOGGING_ACTION_TYPE,
                  text: DEFAULT_LOGGING_ACTION_TEXT,
                  [DEFAULT_LOGGING_ACTION_TYPE]: {
                    text: DEFAULT_LOGGING_ACTION_TEXT,
                  },
                },
              ],
              watch: defaultWatchJson,
            })
          );
        });

        test('should surface the API errors from the "save" HTTP request', async () => {
          const { form, actions, component, exists, find } = testBed;
          const { watch } = WATCH;

          form.setInputValue('nameInput', watch.name);
          form.setInputValue('idInput', watch.id);

          const error = {
            status: 400,
            error: 'Bad request',
            message: 'Watch payload is invalid',
          };

          httpRequestsMockHelpers.setSaveWatchResponse(watch.id, undefined, { body: error });

          await act(async () => {
            actions.clickSubmitButton();
            await nextTick();
            component.update();
          });

          expect(exists('sectionError')).toBe(true);
          expect(find('sectionError').text()).toContain(error.message);
        });
      });
    });

    describe('simulate', () => {
      beforeEach(() => {
        const { actions, form } = testBed;

        // Set watch id (required field) and switch to simulate tab
        form.setInputValue('idInput', WATCH.watch.id);
        actions.selectTab('simulate');
      });

      describe('form payload & API errors', () => {
        test('should execute a watch with no input', async () => {
          const { actions } = testBed;
          const {
            watch: { id, type },
          } = WATCH;

          await act(async () => {
            actions.clickSimulateButton();
            await nextTick();
          });

          const latestRequest = server.requests[server.requests.length - 1];

          const actionModes = Object.keys(defaultWatchJson.actions).reduce(
            (actionAccum: any, action) => {
              actionAccum[action] = 'simulate';
              return actionAccum;
            },
            {}
          );

          const executedWatch = {
            id,
            type,
            isNew: true,
            isActive: true,
            actions: [],
            watch: defaultWatchJson,
          };

          expect(latestRequest.requestBody).toEqual(
            wrapBodyResponse({
              executeDetails: getExecuteDetails({
                actionModes,
              }),
              watch: executedWatch,
            })
          );
        });

        test('should execute a watch with a valid payload', async () => {
          const { actions, form, find, exists, component } = testBed;
          const {
            watch: { id, type },
          } = WATCH;

          const SCHEDULED_TIME = '5';
          const TRIGGERED_TIME = '5';
          const IGNORE_CONDITION = true;
          const ACTION_MODE = 'force_execute';

          form.setInputValue('scheduledTimeInput', SCHEDULED_TIME);
          form.setInputValue('triggeredTimeInput', TRIGGERED_TIME);
          form.toggleEuiSwitch('ignoreConditionSwitch');
          form.setInputValue('actionModesSelect', ACTION_MODE);

          expect(exists('simulateResultsFlyout')).toBe(false);

          httpRequestsMockHelpers.setLoadExecutionResultResponse({
            watchHistoryItem: {
              details: {},
              watchStatus: {
                actionStatuses: [],
              },
            },
          });

          await act(async () => {
            actions.clickSimulateButton();
            await nextTick();
            component.update();
          });

          const latestRequest = server.requests[server.requests.length - 1];

          const actionModes = Object.keys(defaultWatchJson.actions).reduce(
            (actionAccum: any, action) => {
              actionAccum[action] = ACTION_MODE;
              return actionAccum;
            },
            {}
          );

          const executedWatch = {
            id,
            type,
            isNew: true,
            isActive: true,
            actions: [],
            watch: defaultWatchJson,
          };

          const triggeredTime = `now+${TRIGGERED_TIME}s`;
          const scheduledTime = `now+${SCHEDULED_TIME}s`;

          expect(latestRequest.requestBody).toEqual(
            wrapBodyResponse({
              executeDetails: getExecuteDetails({
                triggerData: {
                  triggeredTime,
                  scheduledTime,
                },
                ignoreCondition: IGNORE_CONDITION,
                actionModes,
              }),
              watch: executedWatch,
            })
          );
          expect(exists('simulateResultsFlyout')).toBe(true);
          expect(find('simulateResultsFlyoutTitle').text()).toEqual('Simulation results');
        });
      });
    });
  });
});
