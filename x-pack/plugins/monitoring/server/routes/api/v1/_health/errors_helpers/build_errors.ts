/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitoredProduct } from '../types';

export type Products = {
  [product in MonitoredProduct]?: ErrorsByMetricset;
};

interface ErrorsByMetricset {
  [dataset: string]: ErrorDetails[];
}

interface ErrorDetails {
  message: string;
  lastSeen: string;
}

/**
 * builds a normalized representation of the metricbeat and integration package errors from the provided
 * query buckets with a product->metricset hierarchy where
 *  product: the monitored products (eg elasticsearch)
 *  metricset: the collected metricsets for a given entity
 *
 * example:
 * {
 *   "products": {
 *     "logstash": {
 *        "node": {
 *          "message": "some error message",
 *          "lastSeen": "2022-05-17T16:56:52.929Z"
 *        }
 *     }
 *   }
 * }
 */
export const buildErrors = (modulesBucket: any[]): Products => {
  return (modulesBucket ?? []).reduce((module, { key, errors_by_dataset: errorsByDataset }) => {
    const datasets = buildMetricsets(errorsByDataset.buckets);
    if (Object.keys(datasets).length === 0) {
      return { ...module };
    }

    return {
      ...module,
      [key]: datasets,
    };
  }, {} as Products);
};

const buildMetricsets = (errorsByDataset: any[]): ErrorsByMetricset => {
  return (errorsByDataset ?? []).reduce((dataset, { key, latest_docs: latestDocs }) => {
    const errors = buildErrorMessages(latestDocs.hits.hits ?? []);

    if (errors.length === 0) {
      return { ...dataset };
    }

    return {
      ...dataset,
      [key]: errors,
    };
  }, {} as ErrorsByMetricset);
};

const getErrorMessage = (doc: any) => {
  return doc._source?.error?.message;
};

const buildErrorMessages = (errorDocs: any[]): ErrorDetails[] => {
  const seenErrorMessages = new Set<string>();

  return errorDocs
    .filter((doc) => {
      const message = getErrorMessage(doc);
      if (seenErrorMessages.has(message)) {
        return false;
      } else {
        seenErrorMessages.add(message);
        return true;
      }
    })
    .map((uniqueDoc: any) => {
      const source = uniqueDoc._source;
      return {
        message: getErrorMessage(uniqueDoc),
        lastSeen: source['@timestamp'],
      };
    });
};
