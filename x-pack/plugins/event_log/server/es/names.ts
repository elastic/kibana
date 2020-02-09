/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const EVENT_LOG_NAME_SUFFIX = '-event-log';

export interface EsNames {
  base: string;
  alias: string;
  ilmPolicy: string;
  indexPattern: string;
  initialIndex: string;
  indexTemplate: string;
}

export function getEsNames(baseName: string): EsNames {
  const eventLogName = `${baseName}${EVENT_LOG_NAME_SUFFIX}`;
  return {
    base: baseName,
    alias: eventLogName,
    ilmPolicy: `${eventLogName}-policy`,
    indexPattern: `${eventLogName}-*`,
    initialIndex: `${eventLogName}-000001`,
    indexTemplate: `${eventLogName}-template`,
  };
}
