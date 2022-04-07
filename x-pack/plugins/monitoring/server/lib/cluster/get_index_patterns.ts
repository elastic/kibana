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
  INDEX_PATTERN_ELASTICSEARCH_ECS,
  INDEX_PATTERN_KIBANA,
  INDEX_PATTERN_LOGSTASH,
  INDEX_PATTERN_BEATS,
  INDEX_ALERTS,
  DS_INDEX_PATTERN_TYPES,
  DS_INDEX_PATTERN_METRICS,
  INDEX_PATTERN_TYPES,
  INDEX_PATTERN_ENTERPRISE_SEARCH,
} from '../../../common/constants';
import { MonitoringConfig } from '../..';

export function getIndexPatterns(
  server: LegacyServer,
  additionalPatterns: Record<string, string> = {},
  ccs: string[] = server.config.ui.ccs.remotePatterns
) {
  const config = server.config;
  const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, ccs);
  const kbnIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_KIBANA, ccs);
  const lsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_LOGSTASH, ccs);
  const beatsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_BEATS, ccs);
  const apmIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_BEATS, ccs);
  const alertsIndex = prefixIndexPattern(config, INDEX_ALERTS, ccs);
  const enterpriseSearchIndexPattern = prefixIndexPattern(
    config,
    INDEX_PATTERN_ENTERPRISE_SEARCH,
    ccs
  );
  const indexPatterns = {
    esIndexPattern,
    kbnIndexPattern,
    lsIndexPattern,
    beatsIndexPattern,
    apmIndexPattern,
    alertsIndex,
    enterpriseSearchIndexPattern,
    ...Object.keys(additionalPatterns).reduce((accum, varName) => {
      return {
        ...accum,
        [varName]: prefixIndexPattern(config, additionalPatterns[varName], ccs),
      };
    }, {}),
  };
  return indexPatterns;
}
// calling legacy index patterns those that are .monitoring
export function getLegacyIndexPattern({
  moduleType,
  ecsLegacyOnly = false,
  config,
  ccs,
}: {
  moduleType: INDEX_PATTERN_TYPES;
  ecsLegacyOnly?: boolean;
  config: MonitoringConfig;
  ccs?: string[];
}) {
  let indexPattern = '';
  switch (moduleType) {
    case 'elasticsearch':
      // there may be cases where we only want the legacy ecs version index pattern (>=8.0)
      indexPattern = ecsLegacyOnly ? INDEX_PATTERN_ELASTICSEARCH_ECS : INDEX_PATTERN_ELASTICSEARCH;
      break;
    case 'kibana':
      indexPattern = INDEX_PATTERN_KIBANA;
      break;
    case 'logstash':
      indexPattern = INDEX_PATTERN_LOGSTASH;
      break;
    case 'beats':
      indexPattern = INDEX_PATTERN_BEATS;
      break;
    case 'enterprisesearch':
      indexPattern = INDEX_PATTERN_ENTERPRISE_SEARCH;
      break;
    default:
      throw new Error(`invalid module type to create index pattern: ${moduleType}`);
  }
  return prefixIndexPattern(config, indexPattern, ccs);
}

export function getDsIndexPattern({
  type = DS_INDEX_PATTERN_METRICS,
  moduleType,
  dataset,
  namespace = '*',
  config,
  ccs,
}: {
  type?: string;
  dataset?: string;
  moduleType: INDEX_PATTERN_TYPES;
  namespace?: string;
  config: MonitoringConfig;
  ccs?: string[];
}): string {
  let datasetsPattern = '';
  if (dataset) {
    datasetsPattern = `${moduleType}.${dataset}`;
  } else {
    datasetsPattern = `${moduleType}.*`;
  }
  return prefixIndexPattern(config, `${type}-${datasetsPattern}-${namespace}`, ccs);
}

export function getNewIndexPatterns({
  config,
  moduleType,
  type = DS_INDEX_PATTERN_METRICS,
  dataset,
  namespace = '*',
  ccs,
  ecsLegacyOnly,
}: {
  config: MonitoringConfig;
  moduleType: INDEX_PATTERN_TYPES;
  type?: DS_INDEX_PATTERN_TYPES;
  dataset?: string;
  namespace?: string;
  ccs?: string[];
  ecsLegacyOnly?: boolean;
}): string {
  const legacyIndexPattern = getLegacyIndexPattern({ moduleType, ecsLegacyOnly, config, ccs });
  const dsIndexPattern = getDsIndexPattern({ type, moduleType, dataset, namespace, config, ccs });
  return `${legacyIndexPattern},${dsIndexPattern}`;
}
