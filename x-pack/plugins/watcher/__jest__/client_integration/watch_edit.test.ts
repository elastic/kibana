/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { getWatch } from '../../__fixtures__';
import { defaultWatch } from '../../public/application/models/watch';
import { setupEnvironment, pageHelpers } from './helpers';
import { WatchEditTestBed } from './helpers/watch_edit.helpers';
import { WATCH, WATCH_ID } from './helpers/jest_constants';
import { API_BASE_PATH } from '../../common/constants';


const { setup } = pageHelpers.watchEdit;

describe('<WatchEdit />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: WatchEditTestBed;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('Advanced watch', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadWatchResponse(WATCH_ID, WATCH);

      testBed = await setup(httpSetup);
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

        const DEFAULT_LOGGING_ACTION_ID = 'logging_1';
        const DEFAULT_LOGGING_ACTION_TYPE = 'logging';
        const DEFAULT_LOGGING_ACTION_TEXT =
          'There are {{ctx.payload.hits.total}} documents in your index. Threshold is 10.';

        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/watch/${watch.id}`,
          expect.objectContaining({
            body: JSON.stringify({
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
            }),
          })
        );
      });
    });
  });

  describe('Threshold watch', () => {
    const watch = getWatch({
      id: WATCH_ID,
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
      httpRequestsMockHelpers.setLoadWatchResponse(WATCH_ID, { watch });

      testBed = await setup(httpSetup);
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

        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/watch/${watch.id}`,
          expect.objectContaining({
            body: JSON.stringify({
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
            }),
          })
        );
      });
    });
  });
});
