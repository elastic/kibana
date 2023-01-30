/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldFormat as IFieldFormat } from '@kbn/field-formats-plugin/common';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import type {
  DataViewsPublicPluginStart,
  DataView,
  DataViewSpec,
} from '@kbn/data-views-plugin/public';
import { RuntimeField } from '@kbn/data-views-plugin/public';
import { DataTypesLabels } from '../../components/shared/exploratory_view/labels';
import { syntheticsRuntimeFields } from '../../components/shared/exploratory_view/configurations/synthetics/runtime_fields';
import { getApmDataViewTitle } from '../../components/shared/exploratory_view/utils/utils';
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
  alerts: null,
};

const appRuntimeFields: Record<AppDataType, Array<{ name: string; field: RuntimeField }> | null> = {
  infra_logs: null,
  infra_metrics: null,
  ux: null,
  apm: null,
  synthetics: syntheticsRuntimeFields,
  mobile: null,
  alerts: null,
};

function getFieldFormatsForApp(app: AppDataType) {
  return { runtimeFields: appRuntimeFields[app], formats: appFieldFormats[app] };
}

export const dataViewList: Record<AppDataType, string> = {
  synthetics: 'synthetics_static_index_pattern_id',
  apm: 'apm_static_index_pattern_id',
  ux: 'rum_static_index_pattern_id',
  infra_logs: 'infra_logs_static_index_pattern_id',
  infra_metrics: 'infra_metrics_static_index_pattern_id',
  mobile: 'mobile_static_index_pattern_id',
  alerts: 'alerts_static_index_pattern_id',
};

const getAppIndicesWithPattern = (app: AppDataType, indices: string) => {
  return `${indices}`;
};

const getAppDataViewId = (app: AppDataType, indices: string) => {
  // Replace characters / ? , " < > | * with _
  const postfix = indices.replace(/[^A-Z0-9]+/gi, '_').toLowerCase();

  return `${dataViewList?.[app] ?? app}_${postfix}`;
};

export async function getDataTypeIndices(dataType: AppDataType) {
  switch (dataType) {
    case 'mobile':
    case 'ux':
    case 'apm':
      const resultApm = await getDataHandler('apm')?.hasData();
      return {
        hasData: Boolean(resultApm?.hasData),
        indices: getApmDataViewTitle(resultApm?.indices),
      };
    case 'alerts':
      return {
        hasData: true,
        indices: '.alerts-observability*',
      };
    default:
      const resultUx = await getDataHandler(dataType)?.hasData();
      return { hasData: Boolean(resultUx?.hasData), indices: resultUx?.indices as string };
  }
}

export function isParamsSame(param1: IFieldFormat['_params'], param2?: FieldFormatParams) {
  const isSame =
    param1?.inputFormat === param2?.inputFormat &&
    param1?.outputFormat === param2?.outputFormat &&
    param1?.useShortSuffix === param2?.useShortSuffix &&
    param1?.showSuffix === param2?.showSuffix;

  if (param2?.outputPrecision !== undefined) {
    return param2.outputPrecision === param1?.outputPrecision && isSame;
  }

  return isSame;
}

export class ObservabilityDataViews {
  dataViews: DataViewsPublicPluginStart;
  adHocDataViews: boolean = false;

  constructor(dataViews: DataViewsPublicPluginStart, adHocDataViews?: boolean) {
    this.dataViews = dataViews;
    this.adHocDataViews = adHocDataViews ?? false;
  }

  async createDataView(app: AppDataType, indices: string) {
    const appIndicesPattern = getAppIndicesWithPattern(app, indices);

    const { runtimeFields } = getFieldFormatsForApp(app);

    const dataView = await this.dataViews.create(
      {
        title: appIndicesPattern,
        id: getAppDataViewId(app, indices),
        timeFieldName: '@timestamp',
        fieldFormats: this.getFieldFormats(app),
        name: DataTypesLabels[app],
      },
      false,
      false
    );

    if (runtimeFields !== null) {
      runtimeFields.forEach(({ name, field }) => {
        dataView.addRuntimeField(name, field);
      });
    }

    return dataView;
  }

  async createAndSavedDataView(app: AppDataType, indices: string) {
    const appIndicesPattern = getAppIndicesWithPattern(app, indices);

    const dataViewId = getAppDataViewId(app, indices);

    return await this.dataViews.createAndSave({
      title: appIndicesPattern,
      id: dataViewId,
      timeFieldName: '@timestamp',
      fieldFormats: this.getFieldFormats(app),
      name: DataTypesLabels[app],
    });
  }
  // we want to make sure field formats remain same
  async validateFieldFormats(app: AppDataType, dataView: DataView) {
    const { formats: defaultFieldFormats, runtimeFields } = getFieldFormatsForApp(app);
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
      let hasNewRuntimeField = false;
      if (runtimeFields !== null) {
        const allRunTimeFields = dataView.getAllRuntimeFields();
        runtimeFields.forEach(({ name, field }) => {
          if (!allRunTimeFields[name]) {
            hasNewRuntimeField = true;
            dataView.addRuntimeField(name, field);
          }
        });
      }
      if (isParamsDifferent || hasNewRuntimeField) {
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

  async getDataView(app: AppDataType, indices?: string): Promise<DataView | undefined> {
    let appIndices = indices;
    if (!appIndices) {
      appIndices = (await getDataTypeIndices(app)).indices;
    }

    if (appIndices) {
      try {
        const dataViewId = getAppDataViewId(app, appIndices);
        const dataViewTitle = getAppIndicesWithPattern(app, appIndices);
        // we will get the data view by id

        if (this.adHocDataViews) {
          return await this.createDataView(app, appIndices);
        }

        const dataView = await this.dataViews?.get(dataViewId);

        // and make sure title matches, otherwise, we will need to create it
        if (dataView.title !== dataViewTitle) {
          return await this.createAndSavedDataView(app, appIndices);
        }

        // this is intentional a non blocking call, so no await clause
        this.validateFieldFormats(app, dataView);
        return dataView;
      } catch (e: unknown) {
        if (e instanceof SavedObjectNotFound) {
          return await this.createAndSavedDataView(app, appIndices);
        }
      }
    }
  }
}

// eslint-disable-next-line import/no-default-export
export default ObservabilityDataViews;
