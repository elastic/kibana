/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'profiling';
export const PLUGIN_NAME = 'profiling';

const BASE_ROUTE_PATH = '/api/prodfiler/v2';

export function getRoutePaths() {
  return {
    TopN: `${BASE_ROUTE_PATH}/topn`,
    TopNContainers: `${BASE_ROUTE_PATH}/topn/containers`,
    TopNDeployments: `${BASE_ROUTE_PATH}/topn/deployments`,
    TopNHosts: `${BASE_ROUTE_PATH}/topn/hosts`,
    TopNThreads: `${BASE_ROUTE_PATH}/topn/threads`,
    TopNTraces: `${BASE_ROUTE_PATH}/topn/traces`,
    FlamechartElastic: `${BASE_ROUTE_PATH}/flamechart/elastic`,
  };
}

export function timeRangeFromRequest(request: any): [number, number] {
  const timeFrom = parseInt(request.query.timeFrom!, 10);
  const timeTo = parseInt(request.query.timeTo!, 10);
  return [timeFrom, timeTo];
}

// Converts from a Map object to a Record object since Map objects are not
// serializable to JSON by default
export function fromMapToRecord<K extends string, V>(m: Map<K, V>): Record<string, V> {
  const output: Record<string, V> = {};

  for (const [key, value] of m) {
    output[key] = value;
  }

  return output;
}
