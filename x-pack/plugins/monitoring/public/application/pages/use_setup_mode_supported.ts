/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

// List of RegEx for the routes that use <SetupModeRenderer>
const pagesWithSetupModeSupported = [
  'apm/instances',
  'beats/beats',
  'overview',
  'elasticsearch/ccr',
  'elasticsearch/ccr/.+/shard/.+',
  'elasticsearch/indices/.+/advanced',
  'elasticsearch/indices/.+',
  'elasticsearch/indices',
  'elasticsearch/ml_jobs',
  'elasticsearch/nodes/.+',
  'elasticsearch/nodes',
  'kibana/instances',
  'logstash/nodes',
].map((pattern) => new RegExp(pattern));

export function useSetupModeSupported(hash: string) {
  const page = hash.substring('#/'.length, hash.indexOf('?'));

  return useMemo(() => {
    return pagesWithSetupModeSupported.some((regexp) => {
      return page.match(regexp);
    });
  }, [page]);
}
