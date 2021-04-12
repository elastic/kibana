/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectNotFound } from '../../../../../../../../src/plugins/kibana_utils/public';
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

export const indexPatternList: Record<DataType, string> = {
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

export function isParamsSame(param1: IFieldFormat['_params'], param2: FieldFormatParams) {
  const isSame =
    param1?.inputFormat === param2?.inputFormat &&
    param1?.outputFormat === param2?.outputFormat &&
    param1?.showSuffix === param2?.showSuffix;

  if (param2.outputPrecision !== undefined) {
    return param2?.outputPrecision === param1?.outputPrecision && isSame;
  }

  return isSame;
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

    return await this.data.indexPatterns.createAndSave({
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

      // this is intentional a non blocking call, so no await clause
      this.validateFieldFormats(app, indexPattern);
      return indexPattern;
    } catch (e: unknown) {
      if (e instanceof SavedObjectNotFound) {
        return await this.createIndexPattern(app || 'apm');
      }
    }
  }
}
