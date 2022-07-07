/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { flashAPIErrors, flashSuccessToast } from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';
import { IndexNameLogic } from '../../index_name_logic';

export interface CrawlSchedule {
  frequency: number;
  unit: CrawlUnits;
}

// The BE uses a singular form of each unit
// See shared_togo/app/models/shared_togo/crawler/crawl_schedule.rb
export enum CrawlUnits {
  hours = 'hour',
  days = 'day',
  weeks = 'week',
  months = 'month',
}

export interface AutomaticCrawlSchedulerLogicValues {
  crawlAutomatically: boolean;
  crawlFrequency: CrawlSchedule['frequency'];
  crawlUnit: CrawlSchedule['unit'];
  isSubmitting: boolean;
}

const DEFAULT_VALUES: Pick<AutomaticCrawlSchedulerLogicValues, 'crawlFrequency' | 'crawlUnit'> = {
  crawlFrequency: 7,
  crawlUnit: CrawlUnits.days,
};

export interface AutomaticCrawlSchedulerLogicActions {
  clearCrawlSchedule(): void;
  deleteCrawlSchedule(): void;
  disableCrawlAutomatically(): void;
  onDoneSubmitting(): void;
  enableCrawlAutomatically(): void;
  fetchCrawlSchedule(): void;
  saveChanges(): void;
  setCrawlFrequency(crawlFrequency: CrawlSchedule['frequency']): {
    crawlFrequency: CrawlSchedule['frequency'];
  };
  setCrawlSchedule(crawlSchedule: CrawlSchedule): { crawlSchedule: CrawlSchedule };
  setCrawlUnit(crawlUnit: CrawlSchedule['unit']): { crawlUnit: CrawlSchedule['unit'] };
  submitCrawlSchedule(): void;
  toggleCrawlAutomatically(): void;
}

export const AutomaticCrawlSchedulerLogic = kea<
  MakeLogicType<AutomaticCrawlSchedulerLogicValues, AutomaticCrawlSchedulerLogicActions>
>({
  path: ['enterprise_search', 'crawler', 'automatic_crawl_scheduler'],
  actions: () => ({
    clearCrawlSchedule: true,
    deleteCrawlSchedule: true,
    disableCrawlAutomatically: true,
    onDoneSubmitting: true,
    enableCrawlAutomatically: true,
    fetchCrawlSchedule: true,
    saveChanges: true,
    setCrawlSchedule: (crawlSchedule: CrawlSchedule) => ({ crawlSchedule }),
    submitCrawlSchedule: true,
    setCrawlFrequency: (crawlFrequency: string) => ({ crawlFrequency }),
    setCrawlUnit: (crawlUnit: CrawlUnits) => ({ crawlUnit }),
    toggleCrawlAutomatically: true,
  }),
  reducers: () => ({
    crawlAutomatically: [
      false,
      {
        clearCrawlSchedule: () => false,
        setCrawlSchedule: () => true,
        toggleCrawlAutomatically: (crawlAutomatically) => !crawlAutomatically,
      },
    ],
    crawlFrequency: [
      DEFAULT_VALUES.crawlFrequency,
      {
        clearCrawlSchedule: () => DEFAULT_VALUES.crawlFrequency,
        setCrawlSchedule: (_, { crawlSchedule: { frequency } }) => frequency,
        setCrawlFrequency: (_, { crawlFrequency }) => crawlFrequency,
      },
    ],
    crawlUnit: [
      DEFAULT_VALUES.crawlUnit,
      {
        clearCrawlSchedule: () => DEFAULT_VALUES.crawlUnit,
        setCrawlSchedule: (_, { crawlSchedule: { unit } }) => unit,
        setCrawlUnit: (_, { crawlUnit }) => crawlUnit,
      },
    ],
    isSubmitting: [
      false,
      {
        deleteCrawlSchedule: () => true,
        onDoneSubmitting: () => false,
        submitCrawlSchedule: () => true,
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    deleteCrawlSchedule: async () => {
      const { http } = HttpLogic.values;
      const { indexName } = IndexNameLogic.values;

      try {
        await http.delete(
          `/internal/enterprise_search/indices/${indexName}/crawler/crawl_schedule`
        );
        actions.clearCrawlSchedule();
        flashSuccessToast(
          i18n.translate(
            'xpack.enterpriseSearch.crawler.automaticCrawlScheduler.disableCrawlSchedule.successMessage',
            {
              defaultMessage: 'Automatic crawling has been disabled.',
            }
          )
        );
      } catch (e) {
        // A 404 is expected and means the user has no crawl schedule to delete
        if (e.response?.status === 404) {
          actions.clearCrawlSchedule();
        } else {
          flashAPIErrors(e);
          // Keep the popover open
        }
      } finally {
        actions.onDoneSubmitting();
      }
    },
    fetchCrawlSchedule: async () => {
      const { http } = HttpLogic.values;
      const { indexName } = IndexNameLogic.values;

      try {
        const crawlSchedule: CrawlSchedule = await http.get(
          `/internal/enterprise_search/indices/${indexName}/crawler/crawl_schedule`
        );
        actions.setCrawlSchedule(crawlSchedule);
      } catch (e) {
        // A 404 is expected and means the user does not have crawl schedule
        // for this index. We continue to use the defaults.
        if (e.response.status === 404) {
          actions.clearCrawlSchedule();
        } else {
          flashAPIErrors(e);
        }
      }
    },
    saveChanges: () => {
      if (values.crawlAutomatically) {
        actions.submitCrawlSchedule();
      } else {
        actions.deleteCrawlSchedule();
      }
    },
    submitCrawlSchedule: async () => {
      const { http } = HttpLogic.values;
      const { indexName } = IndexNameLogic.values;

      try {
        const crawlSchedule: CrawlSchedule = await http.put(
          `/internal/enterprise_search/indices/${indexName}/crawler/crawl_schedule`,
          {
            body: JSON.stringify({
              unit: values.crawlUnit,
              frequency: values.crawlFrequency,
            }),
          }
        );
        actions.setCrawlSchedule(crawlSchedule);
        flashSuccessToast(
          i18n.translate(
            'xpack.enterpriseSearch.crawler.automaticCrawlScheduler.submitCrawlSchedule.successMessage',
            {
              defaultMessage: 'Your automatic crawling schedule has been updated.',
            }
          )
        );
      } catch (e) {
        flashAPIErrors(e);
      } finally {
        actions.onDoneSubmitting();
      }
    },
  }),
  events: ({ actions }) => ({
    afterMount: () => {
      actions.fetchCrawlSchedule();
    },
  }),
});
