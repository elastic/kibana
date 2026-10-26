/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { CONTAINER_ID, HOST_NAME } from '../../../common/es_fields/apm';
import { mergeKueries, toKueryFilterFormat } from '../../../common/utils/kuery_utils';

export function hostNamesToKuery(hostNames: string[]) {
  return hostNames.reduce<string>((acc, hostName) => {
    if (isEmpty(acc)) {
      return `${HOST_NAME} : "${hostName}"`;
    }

    return `${acc} OR ${HOST_NAME} : "${hostName}"`;
  }, '');
}

/** Converts the millisecond time range of a profiling route into the seconds of the profiling queries */
export function toProfilingTimeRange({ start, end }: { start: number; end: number }) {
  return {
    startSeconds: start / 1000,
    endSeconds: end / 1000,
    totalSeconds: (end - start) / 1000,
  };
}

/** Kuery of the profiling data of a service's containers or, when it has none, of its hosts */
export function getHostsProfilingKuery({
  hostNames,
  containerIds,
  kuery,
}: {
  hostNames: string[];
  containerIds: string[];
  kuery: string;
}) {
  return containerIds.length > 0
    ? mergeKueries([`(${toKueryFilterFormat(CONTAINER_ID, containerIds)})`, kuery])
    : mergeKueries([`(${toKueryFilterFormat(HOST_NAME, hostNames)})`, kuery]);
}
