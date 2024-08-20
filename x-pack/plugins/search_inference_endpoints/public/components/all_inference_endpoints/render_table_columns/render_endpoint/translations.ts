/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const THREADS = (numThreads: number) =>
  i18n.translate('xpack.searchInferenceEndpoints.elasticsearch.threads', {
    defaultMessage: 'Threads: {numThreads}',
    values: { numThreads },
  });

export const ALLOCATIONS = (numAllocations: number) =>
  i18n.translate('xpack.searchInferenceEndpoints.elasticsearch.allocations', {
    defaultMessage: 'Allocations: {numAllocations}',
    values: { numAllocations },
  });

export const MIT_LICENSE = i18n.translate(
  'xpack.searchInferenceEndpoints.elasticsearch.mitLicense',
  {
    defaultMessage: 'License: MIT',
  }
);
