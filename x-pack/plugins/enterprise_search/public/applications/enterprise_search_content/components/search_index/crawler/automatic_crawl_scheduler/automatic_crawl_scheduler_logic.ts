/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';
import { CrawlSchedule, CrawlScheduleFromServer, CrawlUnits } from '../../../../api/crawler/types';
import { crawlScheduleServerToClient } from '../../../../api/crawler/utils';
import { IndexNameLogic } from '../../index_name_logic';

export interface AutomaticCrawlSchedulerLogicValues {
  crawlAutomatically: boolean;
  crawlFrequency: CrawlSchedule['frequency'];
  crawlUnit: CrawlSchedule['unit'];
  isSubmitting: boolean;
  useConnectorSchedule: CrawlSchedule['useConnectorSchedule'];
}

const DEFAULT_VALUES: Pick<AutomaticCrawlSchedulerLogicValues, 'crawlFrequency' | 'crawlUnit'> = {
  crawlFrequency: 24,
  crawlUnit: CrawlUnits.hours,
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
  setUseConnectorSchedule(useConnectorSchedule: CrawlSchedule['useConnectorSchedule']): {
    useConnectorSchedule: CrawlSchedule['useConnectorSchedule'];
  };
  submitCrawlSchedule(): void;
  toggleCrawlAutomatically(): void;
}

export const AutomaticCrawlSchedulerLogic = kea<
  MakeLogicType<AutomaticCrawlSchedulerLogicValues, AutomaticCrawlSchedulerLogicActions>
>({
  path: ['enterprise_search', 'crawler', 'automatic_crawl_scheduler_logic'],
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
    setUseConnectorSchedule: (useConnectorSchedule) => ({ useConnectorSchedule }),
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
    useConnectorSchedule: [
      false,
      {
        setCrawlSchedule: (_, { crawlSchedule: { useConnectorSchedule = false } }) =>
          useConnectorSchedule,
        setUseConnectorSchedule: (_, { useConnectorSchedule }) => useConnectorSchedule,
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
      } catch (e) {
        // A 404 is expected and means the user has no crawl schedule to delete
        if (e.response?.status !== 404) {
          flashAPIErrors(e);
        }
      } finally {
        actions.onDoneSubmitting();
      }
    },
    fetchCrawlSchedule: async () => {
      const { http } = HttpLogic.values;
      const { indexName } = IndexNameLogic.values;

      try {
        const crawlSchedule: CrawlScheduleFromServer = await http.get(
          `/internal/enterprise_search/indices/${indexName}/crawler/crawl_schedule`
        );
        actions.setCrawlSchedule(crawlScheduleServerToClient(crawlSchedule));
      } catch (e) {
        // A 404 is expected and means the user does not have crawl schedule
        // for this index. We continue to use the defaults.
        if (e.response?.status !== 404) {
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
    setCrawlUnit: actions.saveChanges,
    setCrawlFrequency: actions.saveChanges,
    setUseConnectorSchedule: actions.saveChanges,
    toggleCrawlAutomatically: actions.saveChanges,
    submitCrawlSchedule: async () => {
      const { http } = HttpLogic.values;
      const { indexName } = IndexNameLogic.values;

      if (!values.crawlUnit || !values.crawlFrequency) {
        return;
      }

      try {
        const crawlSchedule: CrawlScheduleFromServer = await http.put(
          `/internal/enterprise_search/indices/${indexName}/crawler/crawl_schedule`,
          {
            body: JSON.stringify({
              unit: values.crawlUnit,
              frequency: values.crawlFrequency,
              use_connector_schedule: values.useConnectorSchedule,
            }),
          }
        );
        actions.setCrawlSchedule(crawlScheduleServerToClient(crawlSchedule));
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
