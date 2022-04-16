/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpRequest, pageHelpers } from './helpers';

import { act } from 'react-dom/test-utils';
import { indexPatterns } from '@kbn/data-plugin/public';
import { coreMock, docLinksServiceMock } from '@kbn/core/public/mocks';
import { setHttp, init as initDocumentation } from '../../crud_app/services';

const { setup } = pageHelpers.jobCreate;

describe('Create Rollup Job, step 1: Logistics', () => {
  let find;
  let exists;
  let actions;
  let form;
  let getEuiStepsHorizontalActive;
  let startMock;

  beforeAll(() => {
    jest.useFakeTimers();
    startMock = coreMock.createStart();
    setHttp(startMock.http);
    initDocumentation(docLinksServiceMock.createStartContract());
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Set "default" mock responses by not providing any arguments
    mockHttpRequest(startMock.http);

    ({ find, exists, actions, form, getEuiStepsHorizontalActive } = setup());
  });

  afterEach(() => {
    startMock.http.get.mockClear();
    startMock.http.post.mockClear();
    startMock.http.put.mockClear();
  });

  it('should have the horizontal step active on "Logistics"', () => {
    expect(getEuiStepsHorizontalActive()).toContain('Logistics');
  });

  it('should have the title set to "Logistics"', () => {
    expect(exists('rollupJobCreateLogisticsTitle')).toBe(true);
  });

  it('should have a link to the documentation', () => {
    expect(exists('rollupJobCreateLogisticsDocsButton')).toBe(true);
  });

  it('should only have the "next" button visible', () => {
    expect(exists('rollupJobBackButton')).toBe(false);
    expect(exists('rollupJobNextButton')).toBe(true);
    expect(exists('rollupJobSaveButton')).toBe(false);
  });

  it('should display errors when clicking "next" without filling the form', () => {
    expect(exists('rollupJobCreateStepError')).toBeFalsy();

    actions.clickNextStep();

    expect(exists('rollupJobCreateStepError')).toBeTruthy();
    expect(form.getErrorsMessages()).toEqual([
      'Name is required.',
      'Index pattern is required.',
      'Rollup index is required.',
    ]);
    expect(find('rollupJobNextButton').props().disabled).toBe(true);
  });

  describe('form validations', () => {
    describe('index pattern', () => {
      beforeEach(() => {
        expect(find('rollupJobNextButton').props().disabled).toBe(false);
      });

      afterEach(() => {
        expect(find('rollupJobNextButton').props().disabled).toBe(true);
      });

      it('should not allow spaces', async () => {
        await act(async () => {
          form.setInputValue('rollupIndexPattern', 'with space');
        });
        actions.clickNextStep();
        expect(form.getErrorsMessages()).toContain('Remove the spaces from your index pattern.');
      });

      it('should not allow an unknown index pattern', async () => {
        mockHttpRequest(startMock.http, { indxPatternVldtResp: { doesMatchIndices: false } });
        await act(async () => {
          form.setInputValue('rollupIndexPattern', 'unknown');
        });
        actions.clickNextStep();
        expect(form.getErrorsMessages()).toContain("Index pattern doesn't match any indices.");
      });

      it('should not allow an index pattern without time fields', async () => {
        mockHttpRequest(startMock.http, { indxPatternVldtResp: { dateFields: [] } });
        await act(async () => {
          form.setInputValue('rollupIndexPattern', 'abc');
        });
        actions.clickNextStep();
        expect(form.getErrorsMessages()).toContain(
          'Index pattern must match indices that contain time fields.'
        );
      });

      it('should not allow an index pattern that matches a rollup index', async () => {
        mockHttpRequest(startMock.http, {
          indxPatternVldtResp: { doesMatchRollupIndices: true },
        });
        await act(async () => {
          form.setInputValue('rollupIndexPattern', 'abc');
        });
        actions.clickNextStep();
        expect(form.getErrorsMessages()).toContain('Index pattern must not match rollup indices.');
      });

      it('should not be the same as the rollup index name', async () => {
        await act(async () => {
          form.setInputValue('rollupIndexPattern', 'abc');
        });

        await act(async () => {
          form.setInputValue('rollupIndexName', 'abc');
        });

        actions.clickNextStep();

        const errorMessages = form.getErrorsMessages();
        expect(errorMessages).toContain('Index pattern cannot have the same as the rollup index.');
        expect(errorMessages).toContain('Rollup index cannot have the same as the index pattern.');
      });
    });

    describe('rollup index name', () => {
      beforeEach(() => {
        expect(find('rollupJobNextButton').props().disabled).toBe(false);
      });

      afterEach(() => {
        expect(find('rollupJobNextButton').props().disabled).toBe(true);
      });

      it('should not allow spaces', () => {
        form.setInputValue('rollupIndexName', 'with space');
        actions.clickNextStep();
        expect(form.getErrorsMessages()).toContain(
          'Remove the spaces from your rollup index name.'
        );
      });

      it('should not allow invalid characters', () => {
        const expectInvalidChar = (char) => {
          form.setInputValue('rollupIndexName', `rollup_index_${char}`);
          actions.clickNextStep();
          expect(form.getErrorsMessages()).toContain(
            `Remove the characters ${char} from your rollup index name.`
          );
        };

        [...indexPatterns.ILLEGAL_CHARACTERS_VISIBLE, ','].reduce((promise, char) => {
          return promise.then(() => expectInvalidChar(char));
        }, Promise.resolve());
      });

      it('should not allow a dot as first character', () => {
        form.setInputValue('rollupIndexName', '.kibana');
        actions.clickNextStep();
        expect(form.getErrorsMessages()).toContain('Index names cannot begin with periods.');
      });
    });

    describe('rollup cron', () => {
      const changeFrequency = (value) => {
        find('cronFrequencySelect').simulate('change', { target: { value } });
      };

      const generateStringSequenceOfNumbers = (total) =>
        new Array(total).fill('').map((_, i) => (i < 10 ? `0${i}` : i.toString()));

      describe('frequency', () => {
        it('should allow "minute", "hour", "day", "week", "month", "year"', () => {
          const frequencySelect = find('cronFrequencySelect');
          const options = frequencySelect.find('option').map((option) => option.text());
          expect(options).toEqual(['minute', 'hour', 'day', 'week', 'month', 'year']);
        });

        it('should default to "WEEK"', () => {
          const frequencySelect = find('cronFrequencySelect');
          expect(frequencySelect.props().value).toBe('WEEK');
        });

        describe('every minute', () => {
          it('should not have any additional configuration', () => {
            changeFrequency('MINUTE');
            expect(find('cronFrequencyConfiguration').length).toBe(0);
          });
        });

        describe('hourly', () => {
          beforeEach(() => {
            changeFrequency('HOUR');
          });

          it('should have 1 additional configuration', () => {
            expect(find('cronFrequencyConfiguration').length).toBe(1);
            expect(exists('cronFrequencyHourlyMinuteSelect')).toBe(true);
          });

          it('should allow to select any minute from 00 -> 59', () => {
            const minutSelect = find('cronFrequencyHourlyMinuteSelect');
            const options = minutSelect.find('option').map((option) => option.text());
            expect(options).toEqual(generateStringSequenceOfNumbers(60));
          });
        });

        describe('daily', () => {
          beforeEach(() => {
            changeFrequency('DAY');
          });

          it('should have 1 additional configuration with hour and minute selects', () => {
            expect(find('cronFrequencyConfiguration').length).toBe(1);
            expect(exists('cronFrequencyDailyHourSelect')).toBe(true);
            expect(exists('cronFrequencyDailyMinuteSelect')).toBe(true);
          });

          it('should allow to select any hour from 00 -> 23', () => {
            const hourSelect = find('cronFrequencyDailyHourSelect');
            const options = hourSelect.find('option').map((option) => option.text());
            expect(options).toEqual(generateStringSequenceOfNumbers(24));
          });

          it('should allow to select any miute from 00 -> 59', () => {
            const minutSelect = find('cronFrequencyDailyMinuteSelect');
            const options = minutSelect.find('option').map((option) => option.text());
            expect(options).toEqual(generateStringSequenceOfNumbers(60));
          });
        });

        describe('weekly', () => {
          beforeEach(() => {
            changeFrequency('WEEK');
          });

          it('should have 2 additional configurations with day, hour and minute selects', () => {
            expect(find('cronFrequencyConfiguration').length).toBe(2);
            expect(exists('cronFrequencyWeeklyDaySelect')).toBe(true);
            expect(exists('cronFrequencyWeeklyHourSelect')).toBe(true);
            expect(exists('cronFrequencyWeeklyMinuteSelect')).toBe(true);
          });

          it('should allow to select any day of the week', () => {
            const hourSelect = find('cronFrequencyWeeklyDaySelect');
            const options = hourSelect.find('option').map((option) => option.text());
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
            const hourSelect = find('cronFrequencyWeeklyHourSelect');
            const options = hourSelect.find('option').map((option) => option.text());
            expect(options).toEqual(generateStringSequenceOfNumbers(24));
          });

          it('should allow to select any miute from 00 -> 59', () => {
            const minutSelect = find('cronFrequencyWeeklyMinuteSelect');
            const options = minutSelect.find('option').map((option) => option.text());
            expect(options).toEqual(generateStringSequenceOfNumbers(60));
          });
        });

        describe('monthly', () => {
          beforeEach(() => {
            changeFrequency('MONTH');
          });

          it('should have 2 additional configurations with date, hour and minute selects', () => {
            expect(find('cronFrequencyConfiguration').length).toBe(2);
            expect(exists('cronFrequencyMonthlyDateSelect')).toBe(true);
            expect(exists('cronFrequencyMonthlyHourSelect')).toBe(true);
            expect(exists('cronFrequencyMonthlyMinuteSelect')).toBe(true);
          });

          it('should allow to select any date of the month from 1st to 31st', () => {
            const dateSelect = find('cronFrequencyMonthlyDateSelect');
            const options = dateSelect.find('option').map((option) => option.text());
            expect(options.length).toEqual(31);
          });

          it('should allow to select any hour from 00 -> 23', () => {
            const hourSelect = find('cronFrequencyMonthlyHourSelect');
            const options = hourSelect.find('option').map((option) => option.text());
            expect(options).toEqual(generateStringSequenceOfNumbers(24));
          });

          it('should allow to select any miute from 00 -> 59', () => {
            const minutSelect = find('cronFrequencyMonthlyMinuteSelect');
            const options = minutSelect.find('option').map((option) => option.text());
            expect(options).toEqual(generateStringSequenceOfNumbers(60));
          });
        });

        describe('yearly', () => {
          beforeEach(() => {
            changeFrequency('YEAR');
          });

          it('should have 3 additional configurations with month, date, hour and minute selects', () => {
            expect(find('cronFrequencyConfiguration').length).toBe(3);
            expect(exists('cronFrequencyYearlyMonthSelect')).toBe(true);
            expect(exists('cronFrequencyYearlyDateSelect')).toBe(true);
            expect(exists('cronFrequencyYearlyHourSelect')).toBe(true);
            expect(exists('cronFrequencyYearlyMinuteSelect')).toBe(true);
          });

          it('should allow to select any month of the year', () => {
            const monthSelect = find('cronFrequencyYearlyMonthSelect');
            const options = monthSelect.find('option').map((option) => option.text());
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
            const dateSelect = find('cronFrequencyYearlyDateSelect');
            const options = dateSelect.find('option').map((option) => option.text());
            expect(options.length).toEqual(31);
          });

          it('should allow to select any hour from 00 -> 23', () => {
            const hourSelect = find('cronFrequencyYearlyHourSelect');
            const options = hourSelect.find('option').map((option) => option.text());
            expect(options).toEqual(generateStringSequenceOfNumbers(24));
          });

          it('should allow to select any miute from 00 -> 59', () => {
            const minutSelect = find('cronFrequencyYearlyMinuteSelect');
            const options = minutSelect.find('option').map((option) => option.text());
            expect(options).toEqual(generateStringSequenceOfNumbers(60));
          });
        });
      });

      describe('advanced cron expression', () => {
        const activateAdvancedCronExpression = () => {
          find('rollupShowAdvancedCronLink').simulate('click');
        };

        it('should allow to create a cron expression', () => {
          expect(exists('rollupAdvancedCron')).toBe(false);

          activateAdvancedCronExpression();

          expect(exists('rollupAdvancedCron')).toBe(true);
        });

        it('should not be empty', () => {
          activateAdvancedCronExpression();

          form.setInputValue('rollupAdvancedCron', '');
          actions.clickNextStep();

          expect(form.getErrorsMessages()).toContain('Cron pattern or basic interval is required.');
        });

        it('should not allow unvalid expression', () => {
          activateAdvancedCronExpression();

          form.setInputValue('rollupAdvancedCron', 'invalid');
          actions.clickNextStep();

          expect(form.getErrorsMessages()).toContain(
            'Expression has only 1 part. At least 5 parts are required.'
          );
        });
      });
    });

    describe('page size', () => {
      beforeEach(() => {
        expect(find('rollupJobNextButton').props().disabled).toBe(false);
      });

      afterEach(() => {
        expect(find('rollupJobNextButton').props().disabled).toBe(true);
      });

      it('should not be empty', () => {
        form.setInputValue('rollupPageSize', '');
        actions.clickNextStep();
        expect(form.getErrorsMessages()).toContain('Page size is required.');
      });

      it('should be greater than 0', () => {
        form.setInputValue('rollupPageSize', '-1');
        actions.clickNextStep();
        expect(form.getErrorsMessages()).toContain('Page size must be greater than zero.');
      });
    });

    describe('delay', () => {
      beforeEach(() => {
        expect(find('rollupJobNextButton').props().disabled).toBe(false);
      });

      afterEach(() => {
        expect(find('rollupJobNextButton').props().disabled).toBe(true);
      });

      it('should validate the interval format', () => {
        form.setInputValue('rollupDelay', 'abc');
        actions.clickNextStep();
        expect(form.getErrorsMessages()).toContain('Invalid delay format.');
      });

      it('should validate the calendar format', () => {
        form.setInputValue('rollupDelay', '3y');
        actions.clickNextStep();
        expect(form.getErrorsMessages()).toContain(`The 'y' unit only allows values of 1. Try 1y.`);
      });
    });
  });
});
