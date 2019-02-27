/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import sinon from 'sinon';
import axios from 'axios';

import { registerTestBed } from '../utils';
import { rollupJobsStore } from '../../public/crud_app/store';
import { JobCreate } from '../../public/crud_app/sections';
import {
  setHttp,
  MINUTE,
  HOUR,
  DAY,
  WEEK,
  MONTH,
  YEAR,
} from '../../public/crud_app/services';
import { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } from 'ui/index_patterns/constants'; // eslint-disable-line import/no-unresolved

jest.mock('ui/index_patterns', () => {
  const { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } = require.requireActual('ui/index_patterns/constants');
  return {
    INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE,
  };
});

jest.mock('ui/chrome', () => ({
  addBasePath: () => '/api/rollup',
  breadcrumbs: {
    set: () => {},
  },
}));

jest.mock('lodash/function/debounce', () => fn => fn);

// axios has a $http like interface so using it to simulate $http
setHttp(axios.create());

const initUserActions = (component, findTestSubject) => {
  const clickNextStep = () => {
    const button = findTestSubject('rollupJobNextButton');
    button.simulate('click');
    component.update();
  };

  const clickPreviousStep = () => {
    const button = findTestSubject('rollupJobBackButton');
    button.simulate('click');
    component.update();
  };

  const clickSave = () => {
    const button = findTestSubject('rollupJobSaveButton');
    button.simulate('click');
    component.update();
  };

  return {
    clickNextStep,
    clickPreviousStep,
    clickSave,
  };
};

const initTestBed = () => {
  const testBed = registerTestBed(JobCreate, {}, rollupJobsStore)();

  return {
    ...testBed,
    userActions: {
      ...initUserActions(testBed.component, testBed.findTestSubject)
    }
  };
};

const mockServerResponses = server => {
  const mockIndexPatternValidityResponse = (response) => {
    const defaultResponse = {
      doesMatchIndices: true,
      doesMatchRollupIndices: false,
      dateFields: ['foo.bar'],
      numericFields: [],
      keywordFields: [],
    };
    server.respondWith(/\/api\/rollup\/index_pattern_validity\/.*/, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ ...defaultResponse, ...response }),
    ]);
  };

  mockIndexPatternValidityResponse();

  return { mockIndexPatternValidityResponse };
};

describe('Create Rollup Job', () => {
  let server;
  let component;
  let findTestSubject;
  let testSubjectExists;
  let userActions;
  let getFormErrorsMessages;
  let form;
  let mockIndexPatternValidityResponse;

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;
    ({ mockIndexPatternValidityResponse } = mockServerResponses(server));
    ({
      component,
      findTestSubject,
      testSubjectExists,
      userActions,
      getFormErrorsMessages,
      form
    } = initTestBed());
  });

  afterEach(() => {
    server.restore();
  });

  describe('Step 1: Logistics', () => {
    it('should have the horizontal step active on "Logistics"', () => {
      const activeSteps = component.find('.euiStepHorizontal-isSelected');
      expect(activeSteps.text()).toContain('Logistics');
    });

    it('should have the title set to "Logistics"', () => {
      expect(testSubjectExists('rollupJobCreateLogisticsTitle')).toBe(true);
    });

    it('should only have the "next" button visible', () => {
      expect(testSubjectExists('rollupJobBackButton')).toBe(false);
      expect(testSubjectExists('rollupJobNextButton')).toBe(true);
      expect(testSubjectExists('rollupJobSaveButton')).toBe(false);
    });

    it('should output errors when clicking "next" without filling the form', () => {
      expect(testSubjectExists('rollupJobCreateStepError')).toBeFalsy();

      userActions.clickNextStep();

      expect(testSubjectExists('rollupJobCreateStepError')).toBeTruthy();
      expect(getFormErrorsMessages()).toEqual([
        'Name is required.',
        'Index pattern is required.',
        'Rollup index is required.',
      ]);
    });

    describe('form validations', () => {
      describe('index pattern', () => {
        it('should not allow spaces', async () => {
          await form.setInputValue('rollupIndexPattern', 'with space', true);
          userActions.clickNextStep();
          expect(getFormErrorsMessages()).toContain('Remove the spaces from your index pattern.');
        });

        it('should not allow an unknown index pattern', async () => {
          mockIndexPatternValidityResponse({ doesMatchIndices: false });
          await form.setInputValue('rollupIndexPattern', 'unknown', true);
          userActions.clickNextStep();
          expect(getFormErrorsMessages()).toContain('Index pattern doesn\'t match any indices.');
        });

        it('should not allow an index pattern without time fields', async () => {
          mockIndexPatternValidityResponse({ dateFields: [] });
          await form.setInputValue('rollupIndexPattern', 'abc', true);
          userActions.clickNextStep();
          expect(getFormErrorsMessages()).toContain('Index pattern must match indices that contain time fields.');
        });

        it('should not allow an index pattern that matches a rollup index', async () => {
          mockIndexPatternValidityResponse({ doesMatchRollupIndices: true });
          await form.setInputValue('rollupIndexPattern', 'abc', true);
          userActions.clickNextStep();
          expect(getFormErrorsMessages()).toContain('Index pattern must not match rollup indices.');
        });

        it('should not be the same as the rollup index name', async () => {
          await form.setInputValue('rollupIndexPattern', 'abc', true);
          await form.setInputValue('rollupIndexName', 'abc', true);

          userActions.clickNextStep();

          const errorMessages = getFormErrorsMessages();
          expect(errorMessages).toContain('Index pattern cannot have the same as the rollup index.');
          expect(errorMessages).toContain('Rollup index cannot have the same as the index pattern.');
        });
      });

      describe('rollup index name', () => {
        it('should not allow spaces', () => {
          form.setInputValue('rollupIndexName', 'with space');
          userActions.clickNextStep();
          expect(getFormErrorsMessages()).toContain('Remove the spaces from your rollup index name.');
        });

        it('should not allow invalid characters', () => {
          const expectInvalidChar = (char) => {
            form.setInputValue('rollupIndexName', `rollup_index_${char}`);
            userActions.clickNextStep();
            expect(getFormErrorsMessages()).toContain(`Remove the characters ${char} from your rollup index name.`);
          };

          [...INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE, ','].reduce((promise, char) => {
            return promise.then(() => expectInvalidChar(char));
          }, Promise.resolve());
        });

        it('should not allow a dot as first character', () => {
          form.setInputValue('rollupIndexName', '.kibana');
          userActions.clickNextStep();
          expect(getFormErrorsMessages()).toContain('Index names cannot begin with periods.');
        });
      });

      describe('rollup cron', () => {
        const changeFrequency = (value) => {
          findTestSubject('rollupJobCreateFrequencySelect').simulate('change', { target: { value } });
        };

        const generateStringSequenceOfNumbers = (total) => (
          new Array(total).fill('').map((_, i) => i < 10 ? `0${i}` : i.toString())
        );

        describe('frequency', () => {
          it('should allow "minute", "hour", "day", "week", "month", "year"', () => {
            const frequencySelect = findTestSubject('rollupJobCreateFrequencySelect');
            const options = frequencySelect.find('option').map(option => option.text());
            expect(options).toEqual(['minute', 'hour', 'day', 'week', 'month', 'year']);
          });

          describe('every minute', () => {
            it('should not have any additional configuration', () => {
              changeFrequency(MINUTE);
              expect(findTestSubject('rollupCronFrequencyConfiguration').length).toBe(0);
            });
          });

          describe('hourly', () => {
            beforeEach(() => {
              changeFrequency(HOUR);
            });

            it('should have 1 additional configuration', () => {
              expect(findTestSubject('rollupCronFrequencyConfiguration').length).toBe(1);
              expect(testSubjectExists('rollupJobCreateFrequencyHourlyMinuteSelect')).toBe(true);
            });

            it('should allow to select any minute from 00 -> 59', () => {
              const minutSelect = findTestSubject('rollupJobCreateFrequencyHourlyMinuteSelect');
              const options = minutSelect.find('option').map(option => option.text());
              expect(options).toEqual(generateStringSequenceOfNumbers(60));
            });
          });

          describe('daily', () => {
            beforeEach(() => {
              changeFrequency(DAY);
            });

            it('should have 1 additional configuration with hour and minute selects', () => {
              expect(findTestSubject('rollupCronFrequencyConfiguration').length).toBe(1);
              expect(testSubjectExists('rollupJobCreateFrequencyDailyHourSelect')).toBe(true);
              expect(testSubjectExists('rollupJobCreateFrequencyDailyMinuteSelect')).toBe(true);
            });

            it('should allow to select any hour from 00 -> 23', () => {
              const hourSelect = findTestSubject('rollupJobCreateFrequencyDailyHourSelect');
              const options = hourSelect.find('option').map(option => option.text());
              expect(options).toEqual(generateStringSequenceOfNumbers(24));
            });

            it('should allow to select any miute from 00 -> 59', () => {
              const minutSelect = findTestSubject('rollupJobCreateFrequencyDailyMinuteSelect');
              const options = minutSelect.find('option').map(option => option.text());
              expect(options).toEqual(generateStringSequenceOfNumbers(60));
            });
          });

          describe('weekly', () => {
            beforeEach(() => {
              changeFrequency(WEEK);
            });

            it('should have 2 additional configurations with day, hour and minute selects', () => {
              expect(findTestSubject('rollupCronFrequencyConfiguration').length).toBe(2);
              expect(testSubjectExists('rollupJobCreateFrequencyWeeklyDaySelect')).toBe(true);
              expect(testSubjectExists('rollupJobCreateFrequencyWeeklyHourSelect')).toBe(true);
              expect(testSubjectExists('rollupJobCreateFrequencyWeeklyMinuteSelect')).toBe(true);
            });

            it('should allow to select any day of the week', () => {
              const hourSelect = findTestSubject('rollupJobCreateFrequencyWeeklyDaySelect');
              const options = hourSelect.find('option').map(option => option.text());
              expect(options).toEqual([
                'Sunday',
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
              ]);
            });

            it('should allow to select any hour from 00 -> 23', () => {
              const hourSelect = findTestSubject('rollupJobCreateFrequencyWeeklyHourSelect');
              const options = hourSelect.find('option').map(option => option.text());
              expect(options).toEqual(generateStringSequenceOfNumbers(24));
            });

            it('should allow to select any miute from 00 -> 59', () => {
              const minutSelect = findTestSubject('rollupJobCreateFrequencyWeeklyMinuteSelect');
              const options = minutSelect.find('option').map(option => option.text());
              expect(options).toEqual(generateStringSequenceOfNumbers(60));
            });
          });

          describe('monthly', () => {
            beforeEach(() => {
              changeFrequency(MONTH);
            });

            it('should have 2 additional configurations with date, hour and minute selects', () => {
              expect(findTestSubject('rollupCronFrequencyConfiguration').length).toBe(2);
              expect(testSubjectExists('rollupJobCreateFrequencyMonthlyDateSelect')).toBe(true);
              expect(testSubjectExists('rollupJobCreateFrequencyMonthlyHourSelect')).toBe(true);
              expect(testSubjectExists('rollupJobCreateFrequencyMonthlyMinuteSelect')).toBe(true);
            });

            it('should allow to select any date of the month from 1st to 31st', () => {
              const dateSelect = findTestSubject('rollupJobCreateFrequencyMonthlyDateSelect');
              const options = dateSelect.find('option').map(option => option.text());
              expect(options.length).toEqual(31);
            });

            it('should allow to select any hour from 00 -> 23', () => {
              const hourSelect = findTestSubject('rollupJobCreateFrequencyMonthlyHourSelect');
              const options = hourSelect.find('option').map(option => option.text());
              expect(options).toEqual(generateStringSequenceOfNumbers(24));
            });

            it('should allow to select any miute from 00 -> 59', () => {
              const minutSelect = findTestSubject('rollupJobCreateFrequencyMonthlyMinuteSelect');
              const options = minutSelect.find('option').map(option => option.text());
              expect(options).toEqual(generateStringSequenceOfNumbers(60));
            });
          });

          describe('yearly', () => {
            beforeEach(() => {
              changeFrequency(YEAR);
            });

            it('should have 3 additional configurations with month, date, hour and minute selects', () => {
              expect(findTestSubject('rollupCronFrequencyConfiguration').length).toBe(3);
              expect(testSubjectExists('rollupJobCreateFrequencyYearlyMonthSelect')).toBe(true);
              expect(testSubjectExists('rollupJobCreateFrequencyYearlyDateSelect')).toBe(true);
              expect(testSubjectExists('rollupJobCreateFrequencyYearlyHourSelect')).toBe(true);
              expect(testSubjectExists('rollupJobCreateFrequencyYearlyMinuteSelect')).toBe(true);
            });

            it('should allow to select any month of the year', () => {
              const monthSelect = findTestSubject('rollupJobCreateFrequencyYearlyMonthSelect');
              const options = monthSelect.find('option').map(option => option.text());
              expect(options).toEqual([
                'January',
                'February',
                'March',
                'April',
                'May',
                'June',
                'July',
                'August',
                'September',
                'October',
                'November',
                'December',
              ]);
            });

            it('should allow to select any date of the month from 1st to 31st', () => {
              const dateSelect = findTestSubject('rollupJobCreateFrequencyYearlyDateSelect');
              const options = dateSelect.find('option').map(option => option.text());
              expect(options.length).toEqual(31);
            });

            it('should allow to select any hour from 00 -> 23', () => {
              const hourSelect = findTestSubject('rollupJobCreateFrequencyYearlyHourSelect');
              const options = hourSelect.find('option').map(option => option.text());
              expect(options).toEqual(generateStringSequenceOfNumbers(24));
            });

            it('should allow to select any miute from 00 -> 59', () => {
              const minutSelect = findTestSubject('rollupJobCreateFrequencyYearlyMinuteSelect');
              const options = minutSelect.find('option').map(option => option.text());
              expect(options).toEqual(generateStringSequenceOfNumbers(60));
            });
          });
        });

        describe('advanced cron expression', () => {
          const activateAdvancedCronExpression = () => {
            findTestSubject('rollupShowAdvancedCronLink').simulate('click');
          };

          it('should allow to create a cron expression', () => {
            expect(testSubjectExists('rollupAdvancedCron')).toBe(false);

            activateAdvancedCronExpression();

            expect(testSubjectExists('rollupAdvancedCron')).toBe(true);
          });

          it('should not be empty', () => {
            activateAdvancedCronExpression();

            form.setInputValue('rollupAdvancedCron', '');
            userActions.clickNextStep();

            expect(getFormErrorsMessages()).toContain('Cron pattern or basic interval is required.');
          });

          it('should not allow unvalid expression', () => {
            activateAdvancedCronExpression();

            form.setInputValue('rollupAdvancedCron', 'invalid');
            userActions.clickNextStep();

            expect(getFormErrorsMessages()).toContain('Expression has only 1 part. At least 5 parts are required.');
          });
        });
      });

      describe('page size', () => {
        it('should not be empty', () => {
          form.setInputValue('rollupPageSize', '');
          userActions.clickNextStep();
          expect(getFormErrorsMessages()).toContain('Page size is required.');
        });

        it('should be greater than 0', () => {
          form.setInputValue('rollupPageSize', '-1');
          userActions.clickNextStep();
          expect(getFormErrorsMessages()).toContain('Page size must be greater than 0.');
        });
      });
    });
  });
});
