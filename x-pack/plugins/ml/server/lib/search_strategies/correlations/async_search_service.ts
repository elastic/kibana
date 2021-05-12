/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shuffle } from 'lodash';

import type { ElasticsearchClient } from 'src/core/server';

import { fetchTransactionDurationFieldCandidates } from './query_field_candidates';
import { fetchTransactionDurationFieldValuePairs } from './query_field_value_pairs';
import { fetchTransactionDurationHistogram, HistogramItem } from './query_histogram';
import { fetchTransactionDurationHistogramInterval } from './query_histogram_interval';

export interface SearchServiceParams {
  index: string;
  environment?: string;
  kuery?: string;
  serviceName?: string;
  transactionName?: string;
  transactionType?: string;
  start?: string;
  end?: string;
}

export interface SearchServiceValue {
  histogram: HistogramItem[];
  value: string;
  field: string;
  diff: number;
}

export interface AsyncSearchProviderProgress {
  started: number;
  loadedHistogramStepsize: number;
  loadedOverallHistogram: number;
  loadedFieldCanditates: number;
  loadedFieldValuePairs: number;
  loadedHistograms: number;
  getOverallProgress: () => number;
}

export const asyncSearchServiceProvider = (
  esClient: ElasticsearchClient,
  params: SearchServiceParams
) => {
  let isCancelled = false;
  let isRunning = true;
  let error: Error;

  const progress: AsyncSearchProviderProgress = {
    started: Date.now(),
    loadedHistogramStepsize: 0,
    loadedOverallHistogram: 0,
    loadedFieldCanditates: 0,
    loadedFieldValuePairs: 0,
    loadedHistograms: 0,
    getOverallProgress: () =>
      progress.loadedHistogramStepsize * 0.05 +
      progress.loadedOverallHistogram * 0.05 +
      progress.loadedFieldCanditates * 0.05 +
      progress.loadedFieldValuePairs * 0.05 +
      progress.loadedHistograms * 0.8,
  };

  let values: SearchServiceValue[] = [];

  const cancel = () => {
    isCancelled = true;
  };

  const fetchCorrelations = async () => {
    try {
      const histogramStepSize = await fetchTransactionDurationHistogramInterval(esClient, params);
      progress.loadedHistogramStepsize = 1;

      if (isCancelled) {
        isRunning = false;
        return;
      }

      const overallHistogram = await fetchTransactionDurationHistogram(
        esClient,
        params,
        histogramStepSize
      );
      progress.loadedOverallHistogram = 1;

      if (isCancelled) {
        isRunning = false;
        return;
      }

      const fieldCandidates = await fetchTransactionDurationFieldCandidates(esClient, params);
      progress.loadedFieldCanditates = 1;

      if (isCancelled) {
        isRunning = false;
        return;
      }

      const fieldValuePairs = await fetchTransactionDurationFieldValuePairs(
        esClient,
        params,
        fieldCandidates,
        progress
      );

      if (isCancelled) {
        isRunning = false;
        return;
      }

      async function* fetchTransactionDurationHistograms() {
        for (const item of shuffle(fieldValuePairs)) {
          if (item === undefined || isCancelled) {
            isRunning = false;
            return;
          }

          const histogram = await fetchTransactionDurationHistogram(
            esClient,
            params,
            histogramStepSize,
            item.field,
            item.value
          );

          if (isCancelled) {
            isRunning = false;
            return;
          }

          let diff = 0;
          const fullHistogram = overallHistogram.map((h) => {
            const histogramItem = histogram.find((di) => di.key === h.key);
            const docCount =
              item !== undefined && histogramItem !== undefined ? histogramItem.doc_count : 0;
            diff = diff + (h.doc_count - docCount);
            return {
              key: h.key,
              doc_count_full: h.doc_count,
              doc_count: docCount,
            };
          });

          yield {
            ...item,
            diff,
            histogram: fullHistogram,
          };
        }
      }

      let loadedHistograms = 0;
      for await (const item of fetchTransactionDurationHistograms()) {
        values.push(item);
        values = values.sort((a, b) => a.diff - b.diff).slice(0, 10);
        loadedHistograms++;
        progress.loadedHistograms = loadedHistograms / fieldValuePairs.length;
      }

      isRunning = false;
    } catch (e) {
      error = e;
    }
  };

  fetchCorrelations();

  return () => ({
    error,
    isRunning,
    loaded: Math.floor(progress.getOverallProgress() * 100),
    started: progress.started,
    total: 100,
    values,
    cancel,
  });
};
