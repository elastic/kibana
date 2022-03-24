/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldFormat as IFieldFormat } from 'src/plugins/field_formats/common';
import { SavedObjectNotFound } from '../../../../../../src/plugins/kibana_utils/public';
import type {
  DataViewsPublicPluginStart,
  DataView,
  DataViewSpec,
} from '../../../../../../src/plugins/data_views/public';
import { rumFieldFormats } from '../../components/shared/exploratory_view/configurations/rum/field_formats';
import { syntheticsFieldFormats } from '../../components/shared/exploratory_view/configurations/synthetics/field_formats';
import {
  AppDataType,
  FieldFormat,
  FieldFormatParams,
} from '../../components/shared/exploratory_view/types';
import { apmFieldFormats } from '../../components/shared/exploratory_view/configurations/apm/field_formats';
import { getDataHandler } from '../../data_handler';
import { infraMetricsFieldFormats } from '../../components/shared/exploratory_view/configurations/infra_metrics/field_formats';

const appFieldFormats: Record<AppDataType, FieldFormat[] | null> = {
  infra_logs: null,
  infra_metrics: infraMetricsFieldFormats,
  ux: rumFieldFormats,
  apm: apmFieldFormats,
  synthetics: syntheticsFieldFormats,
  mobile: apmFieldFormats,
};

function getFieldFormatsForApp(app: AppDataType) {
  return appFieldFormats[app];
}

export const dataViewList: Record<AppDataType, string> = {
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
  infra_metrics: '(infra-metrics-data-view)*',
  mobile: '(mobile-data-view)*',
};

const getAppIndicesWithPattern = (app: AppDataType, indices: string) => {
  return `${appToPatternMap?.[app] ?? app},${indices}`;
};

const getAppDataViewId = (app: AppDataType, indices: string) => {
  // Replace characters / ? , " < > | * with _
  const postfix = indices.replace(/[^A-Z0-9]+/gi, '_').toLowerCase();

  return `${dataViewList?.[app] ?? app}_${postfix}`;
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

export class ObservabilityDataViews {
  dataViews?: DataViewsPublicPluginStart;

  constructor(dataViews: DataViewsPublicPluginStart) {
    this.dataViews = dataViews;
  }

  async createDataView(app: AppDataType, indices: string) {
    if (!this.dataViews) {
      throw new Error('data is not defined');
    }

    const appIndicesPattern = getAppIndicesWithPattern(app, indices);
    return await this.dataViews.createAndSave({
      title: appIndicesPattern,
      id: getAppDataViewId(app, indices),
      timeFieldName: '@timestamp',
      fieldFormats: this.getFieldFormats(app),
    });
  }
  // we want to make sure field formats remain same
  async validateFieldFormats(app: AppDataType, dataView: DataView) {
    const defaultFieldFormats = getFieldFormatsForApp(app);
    if (defaultFieldFormats && defaultFieldFormats.length > 0) {
      let isParamsDifferent = false;
      defaultFieldFormats.forEach(({ field, format }) => {
        const fieldByName = dataView.getFieldByName(field);
        if (fieldByName) {
          const fieldFormat = dataView.getFormatterForField(fieldByName);
          const params = fieldFormat.params();
          if (!isParamsSame(params, format.params) || format.id !== fieldFormat.type.id) {
            dataView.setFieldFormat(field, format);
            isParamsDifferent = true;
          }
        }
      });
      if (isParamsDifferent) {
        await this.dataViews?.updateSavedObject(dataView);
      }
    }
  }

  getFieldFormats(app: AppDataType) {
    const fieldFormatMap: DataViewSpec['fieldFormats'] = {};

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

  async getDataView(app: AppDataType, indices?: string): Promise<DataView | undefined> {
    if (!this.dataViews) {
      throw new Error('data is not defined');
    }
    let appIndices = indices;
    if (!appIndices) {
      appIndices = await this.getDataTypeIndices(app);
    }

    if (appIndices) {
      try {
        const dataViewId = getAppDataViewId(app, appIndices);
        const dataViewTitle = getAppIndicesWithPattern(app, appIndices);
        // we will get the data view by id
        const dataView = await this.dataViews?.get(dataViewId);

        // and make sure title matches, otherwise, we will need to create it
        if (dataView.title !== dataViewTitle) {
          return await this.createDataView(app, appIndices);
        }

        // this is intentional a non blocking call, so no await clause
        this.validateFieldFormats(app, dataView);
        return dataView;
      } catch (e: unknown) {
        if (e instanceof SavedObjectNotFound) {
          return await this.createDataView(app, appIndices);
        }
      }
    }
  }
}

// eslint-disable-next-line import/no-default-export
export default ObservabilityDataViews;
