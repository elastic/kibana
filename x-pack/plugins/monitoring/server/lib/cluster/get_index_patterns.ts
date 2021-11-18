/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegacyServer } from '../../types';
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
        [varName]: prefixIndexPattern(config, additionalPatterns[varName], ccs, true),
      };
    }, {}),
  };
  return indexPatterns;
}

export function getLegacyIndexPattern({ productType }: { productType: string }) {
  let indexPattern = '';
  switch (productType) {
    case 'elasticsearch':
      indexPattern = INDEX_PATTERN_ELASTICSEARCH;
      break;
    default:
      throw new Error('invalid product type to create index pattern');
  }
  return indexPattern;
}

// ***** Move out of clusters??
export function getDsIndexPattern({
  type = DS_INDEX_PATTERN_METRICS,
  productType,
  datasets,
  namespace = '*',
}: {
  type?: string;
  datasets?: string[];
  productType: string;
  namespace?: string;
}): string {
  // if there is one dataset, include in the index pattern else use *.
  // we cannot specify more than one particular dataset in a query because the list
  // of indices could be too long
  let datasetsPattern = '';
  if (datasets) {
    datasetsPattern = datasets.length === 1 ? `${productType}.${datasets[0]}` : '*';
  } else {
    datasetsPattern = `${productType}.*`;
  }
  return `${type}-${datasetsPattern}-${namespace}`;
}

export function getNewIndexPatterns({
  server,
  productType,
  ccs = '*',
  type = DS_INDEX_PATTERN_METRICS,
  datasets,
  namespace = '*',
}: {
  server: LegacyServer;
  productType: string;
  ccs?: string;
  type?: string;
  datasets?: string[];
  namespace?: string;
}): string {
  const dsIndexPattern = getDsIndexPattern({ type, productType, datasets, namespace });
  const legacyIndexPattern = getLegacyIndexPattern({ productType });
  return prefixIndexPattern(server.config(), `${legacyIndexPattern},${dsIndexPattern}`, ccs);
}
