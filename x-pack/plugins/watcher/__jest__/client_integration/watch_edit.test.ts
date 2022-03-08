/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';
import axios from 'axios';
import { getRandomString } from '@kbn/test-jest-helpers';

import { getWatch } from '../../__fixtures__';
import { defaultWatch } from '../../public/application/models/watch';
import { setupEnvironment, pageHelpers, wrapBodyResponse } from './helpers';
import { WatchEditTestBed } from './helpers/watch_edit.helpers';
import { WATCH } from './helpers/jest_constants';

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

jest.mock('../../public/application/lib/api', () => {
  const original = jest.requireActual('../../public/application/lib/api');

  return {
    ...original,
    getHttpClient: () => mockHttpClient,
  };
});

const { setup } = pageHelpers.watchEdit;

describe('<WatchEdit />', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: WatchEditTestBed;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
    server.restore();
  });

  describe('Advanced watch', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadWatchResponse(WATCH);

      testBed = await setup();
      testBed.component.update();
    });

    describe('on component mount', () => {
      test('should set the correct page title', () => {
        const { find } = testBed;
        expect(find('pageTitle').text()).toBe(`Edit ${WATCH.watch.name}`);
      });

      test('should populate the correct values', () => {
        const { find, exists, component } = testBed;
        const { watch } = WATCH;
        const codeEditor = component.find('EuiCodeEditor').at(1);

        expect(exists('jsonWatchForm')).toBe(true);
        expect(find('nameInput').props().value).toBe(watch.name);
        expect(find('idInput').props().value).toBe(watch.id);
        expect(JSON.parse(codeEditor.props().value as string)).toEqual(defaultWatch);

        // ID should not be editable
        expect(find('idInput').props().readOnly).toEqual(true);
      });

      test('save a watch with new values', async () => {
        const { form, actions } = testBed;
        const { watch } = WATCH;

        const EDITED_WATCH_NAME = 'new_watch_name';

        form.setInputValue('nameInput', EDITED_WATCH_NAME);

        await act(async () => {
          actions.clickSubmitButton();
        });

        const latestRequest = server.requests[server.requests.length - 1];

        const DEFAULT_LOGGING_ACTION_ID = 'logging_1';
        const DEFAULT_LOGGING_ACTION_TYPE = 'logging';
        const DEFAULT_LOGGING_ACTION_TEXT =
          'There are {{ctx.payload.hits.total}} documents in your index. Threshold is 10.';

        expect(latestRequest.requestBody).toEqual(
          wrapBodyResponse({
            id: watch.id,
            name: EDITED_WATCH_NAME,
            type: watch.type,
            isNew: false,
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
            watch: defaultWatch,
          })
        );
      });
    });
  });

  describe('Threshold watch', () => {
    const watch = getWatch({
      id: getRandomString(),
      type: 'threshold',
      name: 'my_threshold_watch',
      timeField: '@timestamp',
      triggerIntervalSize: 10,
      triggerIntervalUnit: 'm',
      aggType: 'count',
      termSize: 10,
      thresholdComparator: '>',
      timeWindowSize: 10,
      timeWindowUnit: 'm',
      threshold: [1000],
    });

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadWatchResponse({ watch });

      testBed = await setup();
      testBed.component.update();
    });

    describe('on component mount', () => {
      test('should set the correct page title', () => {
        const { find } = testBed;
        expect(find('pageTitle').text()).toBe(`Edit ${watch.name}`);
      });

      test('should populate the correct values', () => {
        const { find, exists } = testBed;

        expect(exists('thresholdWatchForm')).toBe(true);
        expect(find('nameInput').props().value).toBe(watch.name);
        expect(find('watchTimeFieldSelect').props().value).toBe(watch.timeField);
      });

      test('should save the watch with new values', async () => {
        const { form, actions } = testBed;

        const EDITED_WATCH_NAME = 'new_threshold_watch_name';

        form.setInputValue('nameInput', EDITED_WATCH_NAME);

        await act(async () => {
          actions.clickSubmitButton();
        });

        const latestRequest = server.requests[server.requests.length - 1];

        const {
          id,
          type,
          timeField,
          triggerIntervalSize,
          triggerIntervalUnit,
          aggType,
          termSize,
          thresholdComparator,
          timeWindowSize,
          timeWindowUnit,
          threshold,
        } = watch;

        expect(latestRequest.requestBody).toEqual(
          wrapBodyResponse({
            id,
            name: EDITED_WATCH_NAME,
            type,
            isNew: false,
            isActive: true,
            actions: [],
            timeField,
            triggerIntervalSize,
            triggerIntervalUnit,
            aggType,
            termSize,
            termOrder: 'desc',
            thresholdComparator,
            timeWindowSize,
            timeWindowUnit,
            hasTermsAgg: false,
            threshold: threshold && threshold[0],
          })
        );
      });
    });
  });
});
