/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockHttpValues,
  mockFlashMessageHelpers,
} from '../../../../../__mocks__/kea_logic';
import '../../../../__mocks__/engine_logic.mock';

jest.mock('./manage_crawls_popover_logic', () => ({
  ManageCrawlsPopoverLogic: {
    actions: {
      closePopover: jest.fn(),
    },
  },
}));

import { nextTick } from '@kbn/test-jest-helpers';

import { CrawlUnits } from '../../types';

import { AutomaticCrawlSchedulerLogic } from './automatic_crawl_scheduler_logic';
import { ManageCrawlsPopoverLogic } from './manage_crawls_popover_logic';

describe('AutomaticCrawlSchedulerLogic', () => {
  const { mount } = new LogicMounter(AutomaticCrawlSchedulerLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors, flashSuccessToast } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();

    expect(AutomaticCrawlSchedulerLogic.values).toEqual({
      crawlAutomatically: false,
      crawlFrequency: 7,
      crawlUnit: CrawlUnits.days,
      isSubmitting: false,
    });
  });

  describe('actions', () => {
    describe('clearCrawlSchedule', () => {
      it('sets crawl schedule related values to their defaults', () => {
        mount({
          crawlAutomatically: true,
          crawlFrequency: 36,
          crawlUnit: CrawlUnits.hours,
        });

        AutomaticCrawlSchedulerLogic.actions.clearCrawlSchedule();

        expect(AutomaticCrawlSchedulerLogic.values).toMatchObject({
          crawlAutomatically: false,
          crawlFrequency: 7,
          crawlUnit: CrawlUnits.days,
        });
      });
    });

    describe('toggleCrawlAutomatically', () => {
      it('toggles the ability to crawl automatically', () => {
        mount({
          crawlAutomatically: false,
        });

        AutomaticCrawlSchedulerLogic.actions.toggleCrawlAutomatically();

        expect(AutomaticCrawlSchedulerLogic.values.crawlAutomatically).toEqual(true);

        AutomaticCrawlSchedulerLogic.actions.toggleCrawlAutomatically();

        expect(AutomaticCrawlSchedulerLogic.values.crawlAutomatically).toEqual(false);
      });
    });

    describe('onDoneSubmitting', () => {
      mount({
        isSubmitting: true,
      });

      AutomaticCrawlSchedulerLogic.actions.onDoneSubmitting();

      expect(AutomaticCrawlSchedulerLogic.values.isSubmitting).toEqual(false);
    });

    describe('setCrawlFrequency', () => {
      it("sets the crawl schedule's frequency", () => {
        mount({
          crawlFrequency: 36,
        });

        AutomaticCrawlSchedulerLogic.actions.setCrawlFrequency(12);

        expect(AutomaticCrawlSchedulerLogic.values.crawlFrequency).toEqual(12);
      });
    });

    describe('setCrawlSchedule', () => {
      it("sets the crawl schedule's frequency and unit, and enables crawling automatically", () => {
        mount();

        AutomaticCrawlSchedulerLogic.actions.setCrawlSchedule({
          frequency: 3,
          unit: CrawlUnits.hours,
        });

        expect(AutomaticCrawlSchedulerLogic.values).toMatchObject({
          crawlAutomatically: true,
          crawlFrequency: 3,
          crawlUnit: CrawlUnits.hours,
        });
      });
    });

    describe('setCrawlUnit', () => {
      it("sets the crawl schedule's unit", () => {
        mount({
          crawlUnit: CrawlUnits.months,
        });

        AutomaticCrawlSchedulerLogic.actions.setCrawlUnit(CrawlUnits.weeks);

        expect(AutomaticCrawlSchedulerLogic.values.crawlUnit).toEqual(CrawlUnits.weeks);
      });
    });
  });

  describe('listeners', () => {
    describe('deleteCrawlSchedule', () => {
      it('resets the states of the crawl scheduler and popover, and shows a toast, on success', async () => {
        jest.spyOn(AutomaticCrawlSchedulerLogic.actions, 'clearCrawlSchedule');
        jest.spyOn(ManageCrawlsPopoverLogic.actions, 'closePopover');
        jest.spyOn(AutomaticCrawlSchedulerLogic.actions, 'onDoneSubmitting');
        http.delete.mockReturnValueOnce(Promise.resolve());

        AutomaticCrawlSchedulerLogic.actions.deleteCrawlSchedule();
        await nextTick();

        expect(AutomaticCrawlSchedulerLogic.actions.clearCrawlSchedule).toHaveBeenCalled();
        expect(flashSuccessToast).toHaveBeenCalledWith(expect.any(String));
        expect(ManageCrawlsPopoverLogic.actions.closePopover).toHaveBeenCalled();
        expect(AutomaticCrawlSchedulerLogic.actions.onDoneSubmitting).toHaveBeenCalled();
      });

      describe('error paths', () => {
        it('resets the states of the crawl scheduler and popover on a 404 respose', async () => {
          jest.spyOn(AutomaticCrawlSchedulerLogic.actions, 'clearCrawlSchedule');
          jest.spyOn(ManageCrawlsPopoverLogic.actions, 'closePopover');
          jest.spyOn(AutomaticCrawlSchedulerLogic.actions, 'onDoneSubmitting');
          http.delete.mockReturnValueOnce(
            Promise.reject({
              response: { status: 404 },
            })
          );

          AutomaticCrawlSchedulerLogic.actions.deleteCrawlSchedule();
          await nextTick();

          expect(AutomaticCrawlSchedulerLogic.actions.clearCrawlSchedule).toHaveBeenCalled();
          expect(ManageCrawlsPopoverLogic.actions.closePopover).toHaveBeenCalled();
          expect(AutomaticCrawlSchedulerLogic.actions.onDoneSubmitting).toHaveBeenCalled();
        });

        it('flashes an error on a non-404 respose', async () => {
          jest.spyOn(AutomaticCrawlSchedulerLogic.actions, 'onDoneSubmitting');
          http.delete.mockReturnValueOnce(
            Promise.reject({
              response: { status: 500 },
            })
          );

          AutomaticCrawlSchedulerLogic.actions.deleteCrawlSchedule();
          await nextTick();

          expect(flashAPIErrors).toHaveBeenCalledWith({
            response: { status: 500 },
          });
          expect(AutomaticCrawlSchedulerLogic.actions.onDoneSubmitting).toHaveBeenCalled();
        });
      });
    });

    describe('fetchCrawlSchedule', () => {
      it('set the state of the crawl scheduler on success', async () => {
        jest.spyOn(AutomaticCrawlSchedulerLogic.actions, 'setCrawlSchedule');
        http.get.mockReturnValueOnce(
          Promise.resolve({
            unit: CrawlUnits.days,
            frequency: '30',
          })
        );

        AutomaticCrawlSchedulerLogic.actions.fetchCrawlSchedule();
        await nextTick();

        expect(AutomaticCrawlSchedulerLogic.actions.setCrawlSchedule).toHaveBeenCalledWith({
          unit: CrawlUnits.days,
          frequency: '30',
        });
      });

      describe('error paths', () => {
        it('resets the states of the crawl scheduler on a 404 respose', async () => {
          jest.spyOn(AutomaticCrawlSchedulerLogic.actions, 'clearCrawlSchedule');
          http.get.mockReturnValueOnce(
            Promise.reject({
              response: { status: 404 },
            })
          );

          AutomaticCrawlSchedulerLogic.actions.fetchCrawlSchedule();
          await nextTick();

          expect(AutomaticCrawlSchedulerLogic.actions.clearCrawlSchedule).toHaveBeenCalled();
        });

        it('flashes an error on a non-404 respose', async () => {
          http.get.mockReturnValueOnce(
            Promise.reject({
              response: { status: 500 },
            })
          );

          AutomaticCrawlSchedulerLogic.actions.fetchCrawlSchedule();
          await nextTick();

          expect(flashAPIErrors).toHaveBeenCalledWith({
            response: { status: 500 },
          });
        });
      });
    });

    describe('saveChanges', () => {
      it('updates or creates a crawl schedule if the user has chosen to crawl automatically', () => {
        jest.spyOn(AutomaticCrawlSchedulerLogic.actions, 'submitCrawlSchedule');
        mount({
          crawlAutomatically: true,
        });

        AutomaticCrawlSchedulerLogic.actions.saveChanges();

        expect(AutomaticCrawlSchedulerLogic.actions.submitCrawlSchedule);
      });

      it('deletes the crawl schedule if the user has chosen to disable automatic crawling', () => {
        jest.spyOn(AutomaticCrawlSchedulerLogic.actions, 'deleteCrawlSchedule');
        mount({
          crawlAutomatically: false,
        });

        AutomaticCrawlSchedulerLogic.actions.saveChanges();

        expect(AutomaticCrawlSchedulerLogic.actions.deleteCrawlSchedule);
      });
    });

    describe('submitCrawlSchedule', () => {
      it('sets the states of the crawl scheduler and closes the popover on success', async () => {
        jest.spyOn(AutomaticCrawlSchedulerLogic.actions, 'setCrawlSchedule');
        jest.spyOn(AutomaticCrawlSchedulerLogic.actions, 'onDoneSubmitting');
        http.put.mockReturnValueOnce(
          Promise.resolve({
            unit: CrawlUnits.days,
            frequency: 30,
          })
        );

        AutomaticCrawlSchedulerLogic.actions.submitCrawlSchedule();
        await nextTick();

        expect(AutomaticCrawlSchedulerLogic.actions.setCrawlSchedule).toHaveBeenCalledWith({
          unit: CrawlUnits.days,
          frequency: 30,
        });
        expect(ManageCrawlsPopoverLogic.actions.closePopover).toHaveBeenCalled();
        expect(AutomaticCrawlSchedulerLogic.actions.onDoneSubmitting).toHaveBeenCalled();
      });

      it('flashes an error callout if there is an error', async () => {
        jest.spyOn(AutomaticCrawlSchedulerLogic.actions, 'onDoneSubmitting');
        http.delete.mockReturnValueOnce(
          Promise.reject({
            response: { status: 500 },
          })
        );

        AutomaticCrawlSchedulerLogic.actions.deleteCrawlSchedule();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith({
          response: { status: 500 },
        });
        expect(AutomaticCrawlSchedulerLogic.actions.onDoneSubmitting).toHaveBeenCalled();
      });
    });
  });
});
