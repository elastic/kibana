/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { getAllStats } from './monitoring';
// @ts-ignore
import { getLocalStats } from './local';

export async function getStats(
  req: any,
  config: any,
  start: any,
  end: any,
  { _getAllStats = getAllStats, _getLocalStats = getLocalStats } = {}
) {
  let response = [];

  if (config.get('xpack.monitoring.enabled')) {
    try {
      // attempt to collect stats from multiple clusters in monitoring data
      response = await _getAllStats(req, start, end);
    } catch (err) {
      // no-op
    }
  }

  if (!Array.isArray(response) || response.length === 0) {
    // return it as an array for a consistent API response
    response = [await _getLocalStats(req)];
  }

  return response;
}
