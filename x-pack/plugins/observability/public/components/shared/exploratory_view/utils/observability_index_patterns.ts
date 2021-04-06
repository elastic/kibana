/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DataPublicPluginStart,
  IndexPattern,
  FieldFormat as IFieldFormat,
  IndexPatternSpec,
} from '../../../../../../../../src/plugins/data/public';
import { rumFieldFormats } from '../configurations/rum/field_formats';
import { syntheticsFieldFormats } from '../configurations/synthetics/field_formats';
import { FieldFormat, FieldFormatParams } from '../types';

const appFieldFormats: Record<DataType, FieldFormat[] | null> = {
  rum: rumFieldFormats,
  apm: null,
  logs: null,
  metrics: null,
  synthetics: syntheticsFieldFormats,
};

function getFieldFormatsForApp(app: DataType) {
  return appFieldFormats[app];
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
  synthetics: '(synthetics-data-view)*,heartbeat-*,synthetics-*',
  apm: 'apm-*',
  rum: '(rum-data-view)*,apm-*',
  logs: 'logs-*,filebeat-*',
  metrics: 'metrics-*,metricbeat-*',
};

function isParamsSame(param1: IFieldFormat['_params'], param2: FieldFormatParams) {
  return (
    param1?.inputFormat === param2?.inputFormat &&
    param1?.outputFormat === param2?.outputFormat &&
    param2?.outputPrecision === param1?.outputPrecision
  );
}

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
      fieldFormats: this.getFieldFormats(app),
    });
  }
  // we want to make sure field formats remain same
  async validateFieldFormats(app: DataType, indexPattern: IndexPattern) {
    const defaultFieldFormats = getFieldFormatsForApp(app);
    if (defaultFieldFormats && defaultFieldFormats.length > 0) {
      let isParamsDifferent = false;
      defaultFieldFormats.forEach(({ field, format }) => {
        const fieldFormat = indexPattern.getFormatterForField(indexPattern.getFieldByName(field)!);
        const params = fieldFormat.params();
        if (!isParamsSame(params, format.params)) {
          indexPattern.setFieldFormat(field, format);
          isParamsDifferent = true;
        }
      });
      if (isParamsDifferent) {
        await this.data?.indexPatterns.updateSavedObject(indexPattern);
      }
    }
  }

  getFieldFormats(app: DataType) {
    const fieldFormatMap: IndexPatternSpec['fieldFormats'] = {};

    (appFieldFormats?.[app] ?? []).forEach(({ field, format }) => {
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
