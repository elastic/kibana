/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { prefixIndexPatternWithCcs } from '../../../common/ccs_utils';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  INDEX_PATTERN_ELASTICSEARCH_ECS,
  INDEX_PATTERN_KIBANA,
  INDEX_PATTERN_LOGSTASH,
  INDEX_PATTERN_BEATS,
  DS_INDEX_PATTERN_LOGS,
  DS_INDEX_PATTERN_METRICS,
  INDEX_PATTERN_TYPES,
  INDEX_PATTERN_ENTERPRISE_SEARCH,
} from '../../../common/constants';
import { MonitoringConfig } from '../../config';

interface CommonIndexPatternArgs {
  config: MonitoringConfig;
  moduleType?: INDEX_PATTERN_TYPES;
  dataset?: string;
  namespace?: string;
  ccs?: string;
  ecsLegacyOnly?: boolean;
}

// moduleType is mandatory when type is not informed or when type=metrics
interface MetricIndexPatternArgs extends CommonIndexPatternArgs {
  type?: typeof DS_INDEX_PATTERN_METRICS;
  moduleType: INDEX_PATTERN_TYPES;
}

// moduleType is optional when type=logs
interface LogsIndexPatternArgs extends CommonIndexPatternArgs {
  type: typeof DS_INDEX_PATTERN_LOGS;
}

type IndexPatternArgs = MetricIndexPatternArgs | LogsIndexPatternArgs;

// calling legacy index patterns those that are .monitoring
export function getLegacyIndexPattern({
  moduleType,
  ecsLegacyOnly = false,
  config,
  ccs,
}: {
  moduleType: INDEX_PATTERN_TYPES | 'filebeat';
  ecsLegacyOnly?: boolean;
  config: MonitoringConfig;
  ccs?: string;
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
    case 'apm':
    case 'beats':
      indexPattern = INDEX_PATTERN_BEATS;
      break;
    case 'enterprise_search':
      indexPattern = INDEX_PATTERN_ENTERPRISE_SEARCH;
      break;
    case 'filebeat':
      indexPattern = config.ui.logs.index;
      break;
    default:
      throw new Error(`invalid module type to create index pattern: ${moduleType}`);
  }
  return prefixIndexPatternWithCcs(config, indexPattern, ccs);
}

export function getDsIndexPattern({
  type = DS_INDEX_PATTERN_METRICS,
  moduleType,
  dataset,
  namespace,
  config,
  ccs,
}: CommonIndexPatternArgs & { type?: string }): string {
  const datasetsPattern =
    type === DS_INDEX_PATTERN_METRICS
      ? getMetricsDatasetPattern(moduleType, dataset)
      : getLogsDatasetPattern(moduleType, dataset);

  return prefixIndexPatternWithCcs(config, `${type}-${datasetsPattern}-${namespace ?? '*'}`, ccs);
}

export function getIndexPatterns(indexPattern: IndexPatternArgs): string {
  const legacyModuleType = isLogIndexPattern(indexPattern) ? 'filebeat' : indexPattern.moduleType;
  const { config, ccs, dataset, ecsLegacyOnly, moduleType, namespace, type } = indexPattern;

  const legacyIndexPattern = getLegacyIndexPattern({
    moduleType: legacyModuleType,
    ecsLegacyOnly,
    config,
    ccs,
  });

  const dsIndexPattern = getDsIndexPattern({
    type,
    moduleType,
    dataset,
    namespace,
    config,
    ccs,
  });

  return `${legacyIndexPattern},${dsIndexPattern}`;
}

const getDataset = (moduleType: INDEX_PATTERN_TYPES) => (dataset: string) =>
  getMetricsDatasetPattern(moduleType, dataset);

export const getElasticsearchDataset = getDataset('elasticsearch');
export const getKibanaDataset = getDataset('kibana');
export const getLogstashDataset = getDataset('logstash');
export const getBeatDataset = getDataset('beats');

function buildDatasetPattern(
  moduleType?: INDEX_PATTERN_TYPES,
  dataset?: string,
  prefix?: 'stack_monitoring'
) {
  return `${moduleType ?? '*'}.${prefix ? `${prefix}.` : ''}${dataset ?? '*'}`;
}

function getMetricsDatasetPattern(moduleType?: INDEX_PATTERN_TYPES, dataset?: string) {
  return buildDatasetPattern(moduleType, dataset, 'stack_monitoring');
}

function getLogsDatasetPattern(moduleType?: INDEX_PATTERN_TYPES, dataset?: string) {
  return buildDatasetPattern(moduleType, dataset);
}

const isLogIndexPattern = (args: IndexPatternArgs): args is LogsIndexPatternArgs => {
  return (args as LogsIndexPatternArgs).type === 'logs';
};
