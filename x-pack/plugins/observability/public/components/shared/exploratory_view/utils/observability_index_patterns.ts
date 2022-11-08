/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldFormat as IFieldFormat } from 'src/plugins/field_formats/common';
import { isSavedObjectNotFoundError } from '../../../../../../../../src/plugins/kibana_utils/public';
import {
  DataPublicPluginStart,
  IndexPattern,
  IndexPatternSpec,
} from '../../../../../../../../src/plugins/data/public';
import { rumFieldFormats } from '../configurations/rum/field_formats';
import { syntheticsFieldFormats } from '../configurations/synthetics/field_formats';
import { AppDataType, FieldFormat, FieldFormatParams } from '../types';
import { apmFieldFormats } from '../configurations/apm/field_formats';
import { getDataHandler } from '../../../../data_handler';

const appFieldFormats: Record<AppDataType, FieldFormat[] | null> = {
  infra_logs: null,
  infra_metrics: null,
  ux: rumFieldFormats,
  apm: apmFieldFormats,
  synthetics: syntheticsFieldFormats,
  mobile: apmFieldFormats,
};

function getFieldFormatsForApp(app: AppDataType) {
  return appFieldFormats[app];
}

export const indexPatternList: Record<AppDataType, string> = {
  synthetics: 'synthetics_static_index_pattern_id',
  apm: 'apm_static_index_pattern_id',
  ux: 'rum_static_index_pattern_id',
  infra_logs: 'infra_logs_static_index_pattern_id',
  infra_metrics: 'infra_metrics_static_index_pattern_id',
  mobile: 'mobile_static_index_pattern_id',
};

const appToPatternMap: Record<AppDataType, string> = {
  synthetics: '(synthetics-data-view)*',
  apm: 'apm-*',
  ux: '(rum-data-view)*',
  infra_logs: '',
  infra_metrics: '',
  mobile: '(mobile-data-view)*',
};

const getAppIndicesWithPattern = (app: AppDataType, indices: string) => {
  return `${appToPatternMap[app]},${indices}`;
};

const getAppIndexPatternId = (app: AppDataType, indices: string) => {
  // Replace characters / ? , " < > | * with _
  const postfix = indices.replace(/[^A-Z0-9]+/gi, '_').toLowerCase();

  return `${indexPatternList[app]}_${postfix}`;
};

export function isParamsSame(param1: IFieldFormat['_params'], param2: FieldFormatParams) {
  const isSame =
    param1?.inputFormat === param2?.inputFormat &&
    param1?.outputFormat === param2?.outputFormat &&
    param1?.useShortSuffix === param2?.useShortSuffix &&
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

  async createIndexPattern(app: AppDataType, indices: string) {
    if (!this.data) {
      throw new Error('data is not defined');
    }

    const appIndicesPattern = getAppIndicesWithPattern(app, indices);
    return await this.data.indexPatterns.createAndSave({
      title: appIndicesPattern,
      id: getAppIndexPatternId(app, indices),
      timeFieldName: '@timestamp',
      fieldFormats: this.getFieldFormats(app),
    });
  }
  // we want to make sure field formats remain same
  async validateFieldFormats(app: AppDataType, indexPattern: IndexPattern) {
    const defaultFieldFormats = getFieldFormatsForApp(app);
    if (defaultFieldFormats && defaultFieldFormats.length > 0) {
      let isParamsDifferent = false;
      defaultFieldFormats.forEach(({ field, format }) => {
        const fieldByName = indexPattern.getFieldByName(field);
        if (fieldByName) {
          const fieldFormat = indexPattern.getFormatterForField(fieldByName);
          const params = fieldFormat.params();
          if (!isParamsSame(params, format.params)) {
            indexPattern.setFieldFormat(field, format);
            isParamsDifferent = true;
          }
        }
      });
      if (isParamsDifferent) {
        await this.data?.indexPatterns.updateSavedObject(indexPattern);
      }
    }
  }

  getFieldFormats(app: AppDataType) {
    const fieldFormatMap: IndexPatternSpec['fieldFormats'] = {};

    (appFieldFormats?.[app] ?? []).forEach(({ field, format }) => {
      fieldFormatMap[field] = format;
    });

    return fieldFormatMap;
  }

  async getDataTypeIndices(dataType: AppDataType) {
    switch (dataType) {
      case 'ux':
      case 'synthetics':
        const resultUx = await getDataHandler(dataType)?.hasData();
        return resultUx?.indices;
      case 'apm':
      case 'mobile':
        const resultApm = await getDataHandler('apm')?.hasData();
        return resultApm?.indices.transaction;
    }
  }

  async getIndexPattern(app: AppDataType, indices?: string): Promise<IndexPattern | undefined> {
    if (!this.data) {
      throw new Error('data is not defined');
    }
    let appIndices = indices;
    if (!appIndices) {
      appIndices = await this.getDataTypeIndices(app);
    }

    if (appIndices) {
      try {
        const indexPatternId = getAppIndexPatternId(app, appIndices);
        const indexPatternTitle = getAppIndicesWithPattern(app, appIndices);
        // we will get index pattern by id
        const indexPattern = await this.data?.indexPatterns.get(indexPatternId);

        // and make sure title matches, otherwise, we will need to create it
        if (indexPattern.title !== indexPatternTitle) {
          return await this.createIndexPattern(app, appIndices);
        }

        // this is intentional a non blocking call, so no await clause
        this.validateFieldFormats(app, indexPattern);
        return indexPattern;
      } catch (e) {
        if (isSavedObjectNotFoundError(e)) {
          return await this.createIndexPattern(app, appIndices);
        }
      }
    }
  }
}
