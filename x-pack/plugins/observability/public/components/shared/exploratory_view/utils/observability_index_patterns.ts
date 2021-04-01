/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DataPublicPluginStart,
  IndexPattern,
  IndexPatternSpec,
} from '../../../../../../../../src/plugins/data/public';
import { rumFieldFormats } from '../configurations/rum/field_formats';

const fieldFormats = {
  rum: rumFieldFormats,
};

function getFieldFormatsForApp(app: DataType) {
  return rumFieldFormats;
}

export type DataType = 'synthetics' | 'apm' | 'logs' | 'metrics' | 'rum';

const indexPatternList: Record<DataType, string> = {
  synthetics: 'synthetics_static_index_pattern_id',
  apm: 'apm_static_index_pattern_id',
  rum: 'rum_static_index_pattern_id',
  logs: 'logs_static_index_pattern_id',
  metrics: 'metrics_static_index_pattern_id',
};

const appToPatternMap: Record<DataType, string> = {
  synthetics: 'heartbeat-*',
  apm: 'apm-*',
  rum: '(rum-data-view)*,apm-*',
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
      fieldFormats: this.getFieldFormats(),
    });
  }
  // we want to make sure field formats remain same
  async validateFieldFormats(app: DataType, indexPattern: IndexPattern) {
    const defaultFieldFormats = getFieldFormatsForApp('rum');

    defaultFieldFormats.forEach(({ field, format }) => {
      // const fieldFormat = indexPattern.getFormatterForField(indexPattern.getFieldByName(field)!);
      // const params = fieldFormat.params();
      indexPattern.setFieldFormat(field, format);
    });
    // FIXME only update if it actually changes
    await this.data?.indexPatterns.updateSavedObject(indexPattern);
  }

  getFieldFormats() {
    const fieldFormatMap: IndexPatternSpec['fieldFormats'] = {};

    rumFieldFormats.forEach(({ field, format }) => {
      fieldFormatMap[field] = format;
    });

    return fieldFormatMap;
  }

  async getIndexPattern(app: DataType): Promise<IndexPattern | undefined> {
    if (!this.data) {
      throw new Error('data is not defined');
    }
    try {
      const indexPattern = await this.data?.indexPatterns.get(indexPatternList[app]);

      this.validateFieldFormats(app, indexPattern);
      return indexPattern;
    } catch (e) {
      // FIXME, catch specific error
      return await this.createIndexPattern(app || 'apm');
    }
  }
}
