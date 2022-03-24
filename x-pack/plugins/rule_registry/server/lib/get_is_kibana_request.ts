/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Headers } from 'kibana/server';

/**
 * Taken from
 * https://github.com/elastic/kibana/blob/ec30f2aeeb10fb64b507935e558832d3ef5abfaa/x-pack/plugins/spaces/server/usage_stats/usage_stats_client.ts#L113-L118
 */
export const getIsKibanaRequest = (headers?: Headers): boolean => {
  // The presence of these two request headers gives us a good indication that this is a first-party request from the Kibana client.
  // We can't be 100% certain, but this is a reasonable attempt.
  return !!(headers && headers['kbn-version'] && headers.referer);
};
