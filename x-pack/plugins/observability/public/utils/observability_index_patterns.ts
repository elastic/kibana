/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart, IndexPattern } from '../../../../../src/plugins/data/public';

export type DataType = 'synthetics' | 'apm' | 'logs' | 'metrics' | 'rum';

const indexPatternList: Record<DataType, string> = {
  synthetics: 'synthetics_static_index_pattern_id',
  apm: 'apm_static_index_pattern_id',
  rum: 'apm_static_index_pattern_id',
  logs: 'logs_static_index_pattern_id',
  metrics: 'metrics_static_index_pattern_id',
};

const appToPatternMap: Record<DataType, string> = {
  synthetics: 'heartbeat-*',
  apm: 'apm-*',
  rum: 'apm-*',
  logs: 'logs-*,filebeat-*',
  metrics: 'metrics-*,metricbeat-*',
};

export class ObservabilityIndexPatterns {
  data?: DataPublicPluginStart;

  constructor(data: DataPublicPluginStart) {
    this.data = data;
  }

  async createIndexPattern(app: DataType) {
    if (!this.data) {
      throw new Error('data is not defined');
    }

    const pattern = appToPatternMap[app];

    const fields = await this.data.indexPatterns.getFieldsForWildcard({
      pattern,
    });

    return await this.data.indexPatterns.createAndSave({
      fields,
      title: pattern,
      id: indexPatternList[app],
      timeFieldName: '@timestamp',
    });
  }

  async getIndexPattern(app: DataType): Promise<IndexPattern | undefined> {
    if (!this.data) {
      throw new Error('data is not defined');
    }
    try {
      return await this.data?.indexPatterns.get(indexPatternList[app]);
    } catch (e) {
      return await this.createIndexPattern(app || 'apm');
    }
  }
}
