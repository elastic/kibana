/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { getExecuteDetails } from '../../__fixtures__';
import { WATCH_TYPES, API_BASE_PATH } from '../../common/constants';
import { setupEnvironment, pageHelpers } from './helpers';
import { WatchCreateThresholdTestBed } from './helpers/watch_create_threshold.helpers';

const WATCH_NAME = 'my_test_watch';

const WATCH_TIME_FIELD = '@timestamp';

const MATCH_INDICES = ['index1'];

const ES_FIELDS = [{ name: '@timestamp', type: 'date' }];

jest.mock('uuid/v4', () => {
  return function () {
    return '12345';
  };
});

const SETTINGS = {
  action_types: {
    email: { enabled: true },
    index: { enabled: true },
    jira: { enabled: true },
    logging: { enabled: true },
    pagerduty: { enabled: true },
    slack: { enabled: true },
    webhook: { enabled: true },
  },
};

const WATCH_VISUALIZE_DATA = {
  visualizeData: {
    count: [
      [1559404800000, 14],
      [1559448000000, 196],
      [1559491200000, 44],
    ],
  },
};

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    // Mocking EuiComboBox, as it utilizes "react-virtualized" for rendering search suggestions,
    // which does not produce a valid component wrapper
    EuiComboBox: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockComboBox'}
        data-currentvalue={props.selectedOptions}
        value={props.selectedOptions[0]?.value ?? ''}
        onChange={(syntheticEvent: any) => {
          props.onChange([syntheticEvent['0']]);
        }}
      />
    ),
  };
});

const { setup } = pageHelpers.watchCreateThreshold;

describe('<ThresholdWatchEdit /> create route', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: WatchCreateThresholdTestBed;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

    test('should set the correct page title', () => {
      const { find } = testBed;

      expect(find('pageTitle').text()).toBe('Create threshold alert');
    });

    describe('create', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadMatchingIndicesResponse({ indices: MATCH_INDICES });
        httpRequestsMockHelpers.setLoadEsFieldsResponse({ fields: ES_FIELDS });
        httpRequestsMockHelpers.setLoadSettingsResponse(SETTINGS);
        httpRequestsMockHelpers.setLoadWatchVisualizeResponse(WATCH_VISUALIZE_DATA);
      });

      describe('form validation', () => {
        test('should not allow empty name field', () => {
          const { form } = testBed;

          form.setInputValue('nameInput', '');

          expect(form.getErrorsMessages()).toContain('Name is required.');
        });

        test('should not allow empty time field', () => {
          const { form } = testBed;

          form.setInputValue('watchTimeFieldSelect', '');

          expect(form.getErrorsMessages()).toContain('A time field is required.');
        });

        test('should not allow empty interval size field', () => {
          const { form } = testBed;

          form.setInputValue('triggerIntervalSizeInput', '');

          expect(form.getErrorsMessages()).toContain('Interval size is required.');
        });

        test('should not allow negative interval size field', () => {
          const { form } = testBed;

          form.setInputValue('triggerIntervalSizeInput', '-1');

          expect(form.getErrorsMessages()).toContain('Interval size cannot be a negative number.');
        });

        test('should disable the Create button with invalid fields', () => {
          const { find } = testBed;

          expect(find('saveWatchButton').props().disabled).toEqual(true);
        });

        test('it should enable the Create button and render additional content with valid fields', async () => {
          const { form, find, component, exists } = testBed;

          expect(find('saveWatchButton').props().disabled).toBe(true);

          await act(async () => {
            form.setInputValue('nameInput', 'my_test_watch');
            find('indicesComboBox').simulate('change', [{ label: 'index1', value: 'index1' }]); // Using mocked EuiComboBox
            form.setInputValue('watchTimeFieldSelect', '@timestamp');
          });

          component.update();

          expect(find('saveWatchButton').props().disabled).toBe(false);
          expect(find('watchConditionTitle').text()).toBe('Match the following condition');
          expect(exists('watchVisualizationChart')).toBe(true);
          expect(exists('watchActionsPanel')).toBe(true);
        });

        describe('watch conditions', () => {
          beforeEach(async () => {
            const { form, find, component } = testBed;

            // Name, index and time fields are required before the watch condition expression renders
            await act(async () => {
              form.setInputValue('nameInput', 'my_test_watch');
              find('indicesComboBox').simulate('change', [{ label: 'index1', value: 'index1' }]); // Using mocked EuiComboBox
              form.setInputValue('watchTimeFieldSelect', '@timestamp');
            });
            component.update();
          });

          test('should require a threshold value', async () => {
            const { form, find, component } = testBed;

            // Display the threshold pannel
            act(() => {
              find('watchThresholdButton').simulate('click');
            });
            component.update();

            await act(async () => {
              // Provide invalid value
              form.setInputValue('watchThresholdInput', '');
            });

            // We need to wait for the debounced validation to be triggered and update the DOM
            jest.advanceTimersByTime(500);
            component.update();

            expect(form.getErrorsMessages()).toContain('A value is required.');

            await act(async () => {
              // Provide valid value
              form.setInputValue('watchThresholdInput', '0');
            });
            component.update();
            // No need to wait as the validation errors are cleared whenever the field changes
            expect(form.getErrorsMessages().length).toEqual(0);
          });
        });
      });

      describe('actions', () => {
        beforeEach(async () => {
          const { form, find, component } = testBed;

          // Set up valid fields needed for actions component to render
          await act(async () => {
            form.setInputValue('nameInput', WATCH_NAME);
            find('indicesComboBox').simulate('change', [{ label: 'index1', value: 'index1' }]);
            form.setInputValue('watchTimeFieldSelect', WATCH_TIME_FIELD);
          });
          component.update();
        });

        test('should simulate a logging action', async () => {
          const { form, find, actions, exists } = testBed;

          const LOGGING_MESSAGE = 'test log message';

          actions.clickAddActionButton();
          actions.clickActionLink('logging');

          expect(exists('watchActionAccordion')).toBe(true);

          // First, provide invalid field and verify
          form.setInputValue('loggingTextInput', '');

          expect(form.getErrorsMessages()).toContain('Log text is required.');
          expect(find('simulateActionButton').props().disabled).toEqual(true);

          // Next, provide valid field and verify
          form.setInputValue('loggingTextInput', LOGGING_MESSAGE);

          await act(async () => {
            actions.clickSimulateButton();
          });

          const thresholdWatch = {
            id: '12345',
            name: WATCH_NAME,
            type: WATCH_TYPES.THRESHOLD,
            isNew: true,
            isActive: true,
            actions: [
              {
                id: 'logging_1',
                type: 'logging',
                text: LOGGING_MESSAGE,
                logging: {
                  text: LOGGING_MESSAGE,
                },
              },
            ],
            index: MATCH_INDICES,
            timeField: WATCH_TIME_FIELD,
            triggerIntervalSize: 1,
            triggerIntervalUnit: 'm',
            aggType: 'count',
            termSize: 5,
            termOrder: 'desc',
            thresholdComparator: '>',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            hasTermsAgg: false,
            threshold: 1000,
          };

          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/watch/execute`,
            expect.objectContaining({
              body: JSON.stringify({
                executeDetails: getExecuteDetails({
                  actionModes: {
                    logging_1: 'force_execute',
                  },
                  ignoreCondition: true,
                  recordExecution: false,
                }),
                watch: thresholdWatch,
              }),
            })
          );
        });

        test('should simulate an index action', async () => {
          const { form, actions, exists } = testBed;

          actions.clickAddActionButton();
          actions.clickActionLink('index');

          expect(exists('watchActionAccordion')).toBe(true);

          // Verify an empty index is allowed
          form.setInputValue('indexInput', '');

          await act(async () => {
            actions.clickSimulateButton();
          });

          const thresholdWatch = {
            id: '12345',
            name: WATCH_NAME,
            type: WATCH_TYPES.THRESHOLD,
            isNew: true,
            isActive: true,
            actions: [
              {
                id: 'index_1',
                type: 'index',
                index: {
                  index: '',
                },
              },
            ],
            index: MATCH_INDICES,
            timeField: WATCH_TIME_FIELD,
            triggerIntervalSize: 1,
            triggerIntervalUnit: 'm',
            aggType: 'count',
            termSize: 5,
            termOrder: 'desc',
            thresholdComparator: '>',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            hasTermsAgg: false,
            threshold: 1000,
          };

          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/watch/execute`,
            expect.objectContaining({
              body: JSON.stringify({
                executeDetails: getExecuteDetails({
                  actionModes: {
                    index_1: 'force_execute',
                  },
                  ignoreCondition: true,
                  recordExecution: false,
                }),
                watch: thresholdWatch,
              }),
            })
          );
        });

        test('should simulate a Slack action', async () => {
          const { form, actions, exists } = testBed;

          const SLACK_MESSAGE = 'test slack message';

          actions.clickAddActionButton();
          actions.clickActionLink('slack');

          expect(exists('watchActionAccordion')).toBe(true);

          form.setInputValue('slackMessageTextarea', SLACK_MESSAGE);

          await act(async () => {
            actions.clickSimulateButton();
          });

          const thresholdWatch = {
            id: '12345',
            name: WATCH_NAME,
            type: WATCH_TYPES.THRESHOLD,
            isNew: true,
            isActive: true,
            actions: [
              {
                id: 'slack_1',
                type: 'slack',
                text: SLACK_MESSAGE,
                slack: {
                  message: {
                    text: SLACK_MESSAGE,
                  },
                },
              },
            ],
            index: MATCH_INDICES,
            timeField: WATCH_TIME_FIELD,
            triggerIntervalSize: 1,
            triggerIntervalUnit: 'm',
            aggType: 'count',
            termSize: 5,
            termOrder: 'desc',
            thresholdComparator: '>',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            hasTermsAgg: false,
            threshold: 1000,
          };

          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/watch/execute`,
            expect.objectContaining({
              body: JSON.stringify({
                executeDetails: getExecuteDetails({
                  actionModes: {
                    slack_1: 'force_execute',
                  },
                  ignoreCondition: true,
                  recordExecution: false,
                }),
                watch: thresholdWatch,
              }),
            })
          );
        });

        test('should simulate an email action', async () => {
          const { form, find, actions, exists } = testBed;

          const EMAIL_RECIPIENT = 'test@test.com';
          const EMAIL_SUBJECT = 'test email subject';
          const EMAIL_BODY = 'this is a test email body';

          actions.clickAddActionButton();
          actions.clickActionLink('email');

          expect(exists('watchActionAccordion')).toBe(true);

          // Provide valid fields and verify
          find('watchActionAccordion.toEmailAddressInput').simulate('change', [
            { label: EMAIL_RECIPIENT, value: EMAIL_RECIPIENT },
          ]);
          form.setInputValue('emailSubjectInput', EMAIL_SUBJECT);
          form.setInputValue('emailBodyInput', EMAIL_BODY);

          await act(async () => {
            actions.clickSimulateButton();
          });

          const thresholdWatch = {
            id: '12345',
            name: WATCH_NAME,
            type: WATCH_TYPES.THRESHOLD,
            isNew: true,
            isActive: true,
            actions: [
              {
                id: 'email_1',
                type: 'email',
                to: [EMAIL_RECIPIENT],
                subject: EMAIL_SUBJECT,
                body: EMAIL_BODY,
                email: {
                  to: [EMAIL_RECIPIENT],
                  subject: EMAIL_SUBJECT,
                  body: {
                    text: EMAIL_BODY,
                  },
                },
              },
            ],
            index: MATCH_INDICES,
            timeField: WATCH_TIME_FIELD,
            triggerIntervalSize: 1,
            triggerIntervalUnit: 'm',
            aggType: 'count',
            termSize: 5,
            termOrder: 'desc',
            thresholdComparator: '>',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            hasTermsAgg: false,
            threshold: 1000,
          };

          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/watch/execute`,
            expect.objectContaining({
              body: JSON.stringify({
                executeDetails: getExecuteDetails({
                  actionModes: {
                    email_1: 'force_execute',
                  },
                  ignoreCondition: true,
                  recordExecution: false,
                }),
                watch: thresholdWatch,
              }),
            })
          );
        });

        test('should simulate a webhook action', async () => {
          const { form, find, actions, exists } = testBed;

          const METHOD = 'put';
          const HOST = 'localhost';
          const PORT = '9200';
          const SCHEME = 'http';
          const PATH = '/test';
          const USERNAME = 'test_user';
          const PASSWORD = 'test_password';

          actions.clickAddActionButton();
          actions.clickActionLink('webhook');

          expect(exists('watchActionAccordion')).toBe(true);

          // First, provide invalid fields and verify
          form.setInputValue('webhookHostInput', '');
          form.setInputValue('webhookPortInput', '');

          expect(form.getErrorsMessages()).toEqual([
            'Webhook host is required.',
            'Webhook port is required.',
          ]);
          expect(find('simulateActionButton').props().disabled).toEqual(true);

          // Next, provide valid fields and verify
          form.setInputValue('webhookMethodSelect', METHOD);
          form.setInputValue('webhookHostInput', HOST);
          form.setInputValue('webhookPortInput', PORT);
          form.setInputValue('webhookSchemeSelect', SCHEME);
          form.setInputValue('webhookPathInput', PATH);
          form.setInputValue('webhookUsernameInput', USERNAME);
          form.setInputValue('webhookPasswordInput', PASSWORD);

          await act(async () => {
            actions.clickSimulateButton();
          });

          const thresholdWatch = {
            id: '12345',
            name: WATCH_NAME,
            type: WATCH_TYPES.THRESHOLD,
            isNew: true,
            isActive: true,
            actions: [
              {
                id: 'webhook_1',
                type: 'webhook',
                method: METHOD,
                host: HOST,
                port: Number(PORT),
                scheme: SCHEME,
                path: PATH,
                body: '{\n  "message": "Watch [{{ctx.metadata.name}}] has exceeded the threshold"\n}', // Default
                username: USERNAME,
                password: PASSWORD,
                webhook: {
                  host: HOST,
                  port: Number(PORT),
                },
              },
            ],
            index: MATCH_INDICES,
            timeField: WATCH_TIME_FIELD,
            triggerIntervalSize: 1,
            triggerIntervalUnit: 'm',
            aggType: 'count',
            termSize: 5,
            termOrder: 'desc',
            thresholdComparator: '>',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            hasTermsAgg: false,
            threshold: 1000,
          };

          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/watch/execute`,
            expect.objectContaining({
              body: JSON.stringify({
                executeDetails: getExecuteDetails({
                  actionModes: {
                    webhook_1: 'force_execute',
                  },
                  ignoreCondition: true,
                  recordExecution: false,
                }),
                watch: thresholdWatch,
              }),
            })
          );
        });

        test('should simulate a Jira action', async () => {
          const { form, find, actions, exists } = testBed;

          const PROJECT_KEY = 'TEST_PROJECT_KEY';
          const ISSUE_TYPE = 'Bug';
          const SUMMARY = 'test Jira summary';

          actions.clickAddActionButton();
          actions.clickActionLink('jira');

          expect(exists('watchActionAccordion')).toBe(true);

          // First, provide invalid fields and verify
          form.setInputValue('jiraProjectKeyInput', '');
          form.setInputValue('jiraIssueTypeInput', '');
          form.setInputValue('jiraSummaryInput', '');

          expect(form.getErrorsMessages()).toEqual([
            'Jira project key is required.',
            'Jira issue type is required.',
            'Jira summary is required.',
          ]);
          expect(find('simulateActionButton').props().disabled).toEqual(true);

          // Next, provide valid fields and verify
          form.setInputValue('jiraProjectKeyInput', PROJECT_KEY);
          form.setInputValue('jiraIssueTypeInput', ISSUE_TYPE);
          form.setInputValue('jiraSummaryInput', SUMMARY);

          await act(async () => {
            actions.clickSimulateButton();
          });

          const thresholdWatch = {
            id: '12345',
            name: WATCH_NAME,
            type: WATCH_TYPES.THRESHOLD,
            isNew: true,
            isActive: true,
            actions: [
              {
                id: 'jira_1',
                type: 'jira',
                projectKey: PROJECT_KEY,
                issueType: ISSUE_TYPE,
                summary: SUMMARY,
                jira: {
                  fields: {
                    project: {
                      key: PROJECT_KEY,
                    },
                    issuetype: {
                      name: ISSUE_TYPE,
                    },
                    summary: SUMMARY,
                  },
                },
              },
            ],
            index: MATCH_INDICES,
            timeField: WATCH_TIME_FIELD,
            triggerIntervalSize: 1,
            triggerIntervalUnit: 'm',
            aggType: 'count',
            termSize: 5,
            termOrder: 'desc',
            thresholdComparator: '>',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            hasTermsAgg: false,
            threshold: 1000,
          };

          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/watch/execute`,
            expect.objectContaining({
              body: JSON.stringify({
                executeDetails: getExecuteDetails({
                  actionModes: {
                    jira_1: 'force_execute',
                  },
                  ignoreCondition: true,
                  recordExecution: false,
                }),
                watch: thresholdWatch,
              }),
            })
          );
        });

        test('should simulate a PagerDuty action', async () => {
          const { form, actions, exists, find } = testBed;

          const DESCRIPTION = 'test pagerduty description';

          actions.clickAddActionButton();
          actions.clickActionLink('pagerduty');

          expect(exists('watchActionAccordion')).toBe(true);

          // First, provide invalid fields and verify
          form.setInputValue('pagerdutyDescriptionInput', '');

          expect(form.getErrorsMessages()).toContain('PagerDuty description is required.');
          expect(find('simulateActionButton').props().disabled).toEqual(true);

          // Next, provide valid fields and verify
          form.setInputValue('pagerdutyDescriptionInput', DESCRIPTION);

          await act(async () => {
            actions.clickSimulateButton();
          });

          const thresholdWatch = {
            id: '12345',
            name: WATCH_NAME,
            type: WATCH_TYPES.THRESHOLD,
            isNew: true,
            isActive: true,
            actions: [
              {
                id: 'pagerduty_1',
                type: 'pagerduty',
                description: DESCRIPTION,
                pagerduty: {
                  description: DESCRIPTION,
                },
              },
            ],
            index: MATCH_INDICES,
            timeField: WATCH_TIME_FIELD,
            triggerIntervalSize: 1,
            triggerIntervalUnit: 'm',
            aggType: 'count',
            termSize: 5,
            termOrder: 'desc',
            thresholdComparator: '>',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            hasTermsAgg: false,
            threshold: 1000,
          };

          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/watch/execute`,
            expect.objectContaining({
              body: JSON.stringify({
                executeDetails: getExecuteDetails({
                  actionModes: {
                    pagerduty_1: 'force_execute',
                  },
                  ignoreCondition: true,
                  recordExecution: false,
                }),
                watch: thresholdWatch,
              }),
            })
          );
        });
      });

      describe('watch visualize data payload', () => {
        test('should send the correct payload', async () => {
          const { form, find, component } = testBed;

          // Set up required fields
          await act(async () => {
            form.setInputValue('nameInput', WATCH_NAME);
            find('indicesComboBox').simulate('change', [{ label: 'index1', value: 'index1' }]);
            form.setInputValue('watchTimeFieldSelect', WATCH_TIME_FIELD);
          });
          component.update();

          const lastReq: any[] = httpSetup.post.mock.calls.pop() || [];
          // Options contains two dinamically computed timestamps, so its simpler to just ignore those fields.
          const { options, ...body } = JSON.parse(lastReq[1].body).watch;

          expect(lastReq[0]).toBe(`${API_BASE_PATH}/watch/visualize`);
          expect(body).toEqual({
            id: '12345',
            name: 'my_test_watch',
            type: 'threshold',
            isNew: true,
            isActive: true,
            actions: [],
            index: ['index1'],
            timeField: '@timestamp',
            triggerIntervalSize: 1,
            triggerIntervalUnit: 'm',
            aggType: 'count',
            termSize: 5,
            termOrder: 'desc',
            thresholdComparator: '>',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            hasTermsAgg: false,
            threshold: 1000,
          });
        });
      });

      describe('form payload', () => {
        test('should send the correct payload', async () => {
          const { form, find, component, actions } = testBed;

          // Set up required fields
          await act(async () => {
            form.setInputValue('nameInput', WATCH_NAME);
            find('indicesComboBox').simulate('change', [{ label: 'index1', value: 'index1' }]);
            form.setInputValue('watchTimeFieldSelect', WATCH_TIME_FIELD);
          });
          component.update();

          await act(async () => {
            actions.clickSubmitButton();
          });

          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/watch/12345`,
            expect.objectContaining({
              body: JSON.stringify({
                id: '12345',
                name: WATCH_NAME,
                type: WATCH_TYPES.THRESHOLD,
                isNew: true,
                isActive: true,
                actions: [],
                index: MATCH_INDICES,
                timeField: WATCH_TIME_FIELD,
                triggerIntervalSize: 1,
                triggerIntervalUnit: 'm',
                aggType: 'count',
                termSize: 5,
                termOrder: 'desc',
                thresholdComparator: '>',
                timeWindowSize: 5,
                timeWindowUnit: 'm',
                hasTermsAgg: false,
                threshold: 1000,
              }),
            })
          );
        });
      });
    });
  });
});
