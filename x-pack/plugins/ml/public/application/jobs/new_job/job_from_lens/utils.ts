/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  Embeddable,
  LensPublicStart,
  DataType,
  ChartInfo,
  LensSavedObjectAttributes,
} from '@kbn/lens-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { layerTypes } from '@kbn/lens-plugin/public';
import { KBN_FIELD_TYPES } from '@kbn/field-types';

import { ML_PAGES, ML_APP_LOCATOR } from '../../../../../common/constants/locator';
import { ML_JOB_AGGREGATION } from '../../../../../common/constants/aggregation_types';

export const COMPATIBLE_SERIES_TYPES = [
  'line',
  'bar',
  'bar_stacked',
  'bar_percentage_stacked',
  'bar_horizontal',
  'bar_horizontal_stacked',
  'area',
  'area_stacked',
  'area_percentage_stacked',
];

export const COMPATIBLE_LAYER_TYPE = layerTypes.DATA;

export const COMPATIBLE_VISUALIZATION = 'lnsXY';

export const COMPATIBLE_SPLIT_FIELD_TYPES: DataType[] = [
  KBN_FIELD_TYPES.STRING,
  KBN_FIELD_TYPES.IP,
];

export async function redirectToADJobWizards(
  embeddable: Embeddable,
  layerIndex: number,
  share: SharePluginStart,
  lens: LensPublicStart
) {
  const { query, filters, to, from, vis } = await getJobsItemsFromEmbeddable(embeddable, lens);
  const locator = share.url.locators.get(ML_APP_LOCATOR);

  const url = await locator?.getUrl({
    page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_FROM_LENS,
    pageState: {
      vis: vis as unknown as SerializableRecord,
      from,
      to,
      query,
      filters,
      layerIndex,
    },
  });

  window.open(url, '_blank');
}

export async function getJobsItemsFromEmbeddable(embeddable: Embeddable, lens?: LensPublicStart) {
  if (!lens) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromLens.createJob.error.lensNotFound', {
        defaultMessage: 'Lens is not intialized',
      })
    );
  }

  const { filters, timeRange, ...input } = embeddable.getInput();
  const query = input.query === undefined ? { query: '', language: 'kuery' } : input.query;

  if (timeRange === undefined) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromLens.createJob.error.noTimeRange', {
        defaultMessage: 'Time range not specified.',
      })
    );
  }
  const { to, from } = timeRange;

  const vis = embeddable.getSavedVis();

  if (vis === undefined) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromLens.createJob.error.visNotFound', {
        defaultMessage: 'Visualization cannot be found.',
      })
    );
  }

  const chartInfo = await getChartInfoFromVisualization(lens, vis);
  const dashboard = embeddable.parent?.type === 'dashboard' ? embeddable.parent : undefined;

  return {
    vis,
    chartInfo,
    from,
    to,
    query,
    filters,
    dashboard,
  };
}

export function lensOperationToMlFunction(operationType: string) {
  switch (operationType) {
    case 'average':
      return ML_JOB_AGGREGATION.MEAN;
    case 'count':
      return ML_JOB_AGGREGATION.COUNT;
    case 'max':
      return ML_JOB_AGGREGATION.MAX;
    case 'median':
      return ML_JOB_AGGREGATION.MEDIAN;
    case 'min':
      return ML_JOB_AGGREGATION.MIN;
    case 'sum':
      return ML_JOB_AGGREGATION.SUM;
    case 'unique_count':
      return ML_JOB_AGGREGATION.DISTINCT_COUNT;

    default:
      return null;
  }
}

export function getMlFunction(operationType: string) {
  const func = lensOperationToMlFunction(operationType);
  if (func === null) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromLens.createJob.error.incorrectFunction', {
        defaultMessage:
          'Selected function {operationType} is not supported by anomaly detection detectors',
        values: { operationType },
      })
    );
  }
  return func;
}

export async function getVisTypeFactory(lens: LensPublicStart) {
  const visTypes = await lens.getXyVisTypes();
  return (layer: ChartInfo['layers'][number]) => {
    switch (layer.layerType) {
      case layerTypes.DATA:
        const type = visTypes.find((t) => t.id === layer.chartType);
        return {
          label: type?.fullLabel || type?.label || layer.layerType,
          icon: type?.icon ?? '',
        };
      case layerTypes.ANNOTATIONS:
        // Annotation and Reference line layers are not displayed.
        // but for consistency leave the labels in, in case we decide
        // to display these layers in the future
        return {
          label: i18n.translate('xpack.ml.newJob.fromLens.createJob.VisType.annotations', {
            defaultMessage: 'Annotations',
          }),
          icon: '',
        };
      case layerTypes.REFERENCELINE:
        return {
          label: i18n.translate('xpack.ml.newJob.fromLens.createJob.VisType.referenceLine', {
            defaultMessage: 'Reference line',
          }),
          icon: '',
        };
      default:
        return {
          label: layer.layerType,
          icon: '',
        };
    }
  };
}

export async function isCompatibleVisualizationType(chartInfo: ChartInfo) {
  return (
    chartInfo.visualizationType === COMPATIBLE_VISUALIZATION &&
    chartInfo.layers.some((l) => l.layerType === layerTypes.DATA)
  );
}

export function isCompatibleLayer(layer: ChartInfo['layers'][number]) {
  return (
    layer.layerType === COMPATIBLE_LAYER_TYPE &&
    layer.chartType &&
    COMPATIBLE_SERIES_TYPES.includes(layer.chartType)
  );
}

export function isDataLayer(layer: ChartInfo['layers'][number]) {
  return 'chartType' in layer;
}

export function isTermsField(dimension: ChartInfo['layers'][number]['dimensions'][number]) {
  return dimension.operation.type === 'terms';
}

export function isCompatibleSplitFieldType(
  dimension: ChartInfo['layers'][number]['dimensions'][number]
) {
  return COMPATIBLE_SPLIT_FIELD_TYPES.includes(dimension.operation.dataType);
}

export function hasIncompatibleProperties(
  dimension: ChartInfo['layers'][number]['dimensions'][number]
) {
  return dimension.operation.hasTimeShift || dimension.operation.filter;
}

export function createDetectors(
  fields: ChartInfo['layers'][number]['dimensions'],
  splitField?: ChartInfo['layers'][number]['dimensions'][number]
) {
  return fields.map(({ operation }) => {
    const func = getMlFunction(operation.type);
    return {
      function: func,
      // don't use the source field if the detector is count
      ...(func === 'count' ? {} : { field_name: operation.fields?.[0] }),
      ...(splitField ? { partition_field_name: splitField.operation.fields?.[0] } : {}),
    };
  });
}

export async function getChartInfoFromVisualization(
  lens: LensPublicStart,
  vis: LensSavedObjectAttributes
) {
  const chartInfo = await (await (await lens.stateHelperApi()).chartInfo).getChartInfo(vis);
  if (!chartInfo) {
    throw new Error('Cannot create job, chart info is undefined');
  }
  return chartInfo;
}
