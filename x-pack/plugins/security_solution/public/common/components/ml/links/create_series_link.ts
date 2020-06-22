/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createEntitiesFromScore } from '../score/create_entities_from_score';
import { Anomaly } from '../types';

export const createSeriesLink = (score: Anomaly, startDate: number, endDate: number): string => {
  const startDateIso = new Date(startDate).toISOString();
  const endDateIso = new Date(endDate).toISOString();

  const JOB_PREFIX = `ml#/timeseriesexplorer?_g=(ml:(jobIds:!(${score.jobId}))`;
  const REFRESH_INTERVAL = `,refreshInterval:(display:Off,pause:!f,value:0),time:(from:'${startDateIso}',mode:absolute,to:'${endDateIso}'))`;
  const INTERVAL_SELECTION = `&_a=(mlSelectInterval:(display:Auto,val:auto),mlSelectSeverity:(color:%23d2e9f7,display:warning,val:0),mlTimeSeriesExplorer:(detectorIndex:0,`;
  const ENTITIES = `entities:(${createEntitiesFromScore(score)})))`;

  return `${JOB_PREFIX}${REFRESH_INTERVAL}${INTERVAL_SELECTION}${ENTITIES}`;
};
