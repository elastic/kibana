/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegacyRequest, LegacyServer } from '../../types';
import { prefixIndexPattern } from '../../../common/ccs_utils';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  INDEX_PATTERN_KIBANA,
  INDEX_PATTERN_LOGSTASH,
  INDEX_PATTERN_BEATS,
  INDEX_ALERTS,
  DS_INDEX_PATTERN_METRICS,
} from '../../../common/constants';

export function getIndexPatterns(
  server: LegacyServer,
  additionalPatterns: Record<string, string> = {},
  ccs: string = '*'
) {
  const config = server.config();
  const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, ccs);
  const kbnIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_KIBANA, ccs);
  const lsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_LOGSTASH, ccs);
  const beatsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_BEATS, ccs);
  const apmIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_BEATS, ccs);
  const alertsIndex = prefixIndexPattern(config, INDEX_ALERTS, ccs);
  const indexPatterns = {
    esIndexPattern,
    kbnIndexPattern,
    lsIndexPattern,
    beatsIndexPattern,
    apmIndexPattern,
    alertsIndex,
    ...Object.keys(additionalPatterns).reduce((accum, varName) => {
      return {
        ...accum,
        [varName]: prefixIndexPattern(config, additionalPatterns[varName], ccs),
      };
    }, {}),
  };
  return indexPatterns;
}

export function getLegacyIndexPattern({ moduleType }: { moduleType: string }) {
  let indexPattern = '';
  switch (moduleType) {
    case 'elasticsearch':
      indexPattern = INDEX_PATTERN_ELASTICSEARCH;
      break;
    case 'kibana':
      indexPattern = INDEX_PATTERN_KIBANA;
    default:
      throw new Error('invalid product type to create index pattern');
  }
  return indexPattern;
}

export function getDsIndexPattern({
  type = DS_INDEX_PATTERN_METRICS,
  moduleType,
  datasets,
  namespace = '*',
}: {
  type?: string;
  datasets?: string[];
  moduleType: string;
  namespace?: string;
}): string {
  // if there is one dataset, include in the index pattern else use *.
  // we cannot specify more than one particular dataset in a query because the list
  // of indices could be too long
  let datasetsPattern = '';
  if (datasets) {
    datasetsPattern = datasets.length === 1 ? `${moduleType}.${datasets[0]}` : '*';
  } else {
    datasetsPattern = `${moduleType}.*`;
  }
  return `${type}-${datasetsPattern}-${namespace}`;
}

export function getNewIndexPatterns({
  req,
  moduleType,
  type = DS_INDEX_PATTERN_METRICS,
  datasets,
  namespace = '*',
}: {
  req: LegacyRequest;
  moduleType: string;
  type?: string;
  datasets?: string[];
  namespace?: string;
}): string {
  const dsIndexPattern = getDsIndexPattern({ type, moduleType, datasets, namespace });
  const legacyIndexPattern = getLegacyIndexPattern({ moduleType });
  return prefixIndexPattern(
    req.server.config(),
    `${legacyIndexPattern},${dsIndexPattern}`,
    req.payload.ccs || '*'
  );
}
