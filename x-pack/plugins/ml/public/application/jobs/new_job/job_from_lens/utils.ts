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
  LensSavedObjectAttributes,
  FieldBasedIndexPatternColumn,
  XYDataLayerConfig,
  GenericIndexPatternColumn,
  TermsIndexPatternColumn,
  SeriesType,
  XYLayerConfig,
  DataType,
} from '@kbn/lens-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { layerTypes } from '@kbn/lens-plugin/public';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';

import { ML_PAGES, ML_APP_LOCATOR } from '../../../../../common/constants/locator';
import { ML_JOB_AGGREGATION } from '../../../../../common/constants/aggregation_types';

export const COMPATIBLE_SERIES_TYPES: SeriesType[] = [
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

export const COMPATIBLE_LAYER_TYPE: XYDataLayerConfig['layerType'] = layerTypes.DATA;

export const COMPATIBLE_VISUALIZATION = 'lnsXY';

export const COMPATIBLE_SPLIT_FIELD_TYPES: DataType[] = [
  KBN_FIELD_TYPES.STRING,
  KBN_FIELD_TYPES.IP,
];

export async function redirectToADJobWizards(
  embeddable: Embeddable,
  layerIndex: number,
  share: SharePluginStart
) {
  const { query, filters, to, from, vis } = getJobsItemsFromEmbeddable(embeddable);
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

export function getJobsItemsFromEmbeddable(embeddable: Embeddable) {
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

  const dashboard = embeddable.parent?.type === 'dashboard' ? embeddable.parent : undefined;

  return {
    vis,
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
  return (layer: XYLayerConfig) => {
    switch (layer.layerType) {
      case layerTypes.DATA:
        const type = visTypes.find((t) => t.id === layer.seriesType);
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
          // @ts-expect-error just in case a new layer type appears in the future
          label: layer.layerType,
          icon: '',
        };
    }
  };
}

export async function isCompatibleVisualizationType(savedObject: LensSavedObjectAttributes) {
  const visualization = savedObject.state.visualization as { layers: XYLayerConfig[] };
  return (
    savedObject.visualizationType === COMPATIBLE_VISUALIZATION &&
    visualization.layers.some((l) => l.layerType === layerTypes.DATA)
  );
}

export function isCompatibleLayer(layer: XYLayerConfig): layer is XYDataLayerConfig {
  return (
    isDataLayer(layer) &&
    layer.layerType === COMPATIBLE_LAYER_TYPE &&
    COMPATIBLE_SERIES_TYPES.includes(layer.seriesType)
  );
}

export function isDataLayer(layer: XYLayerConfig): layer is XYDataLayerConfig {
  return 'seriesType' in layer;
}
export function hasSourceField(
  column: GenericIndexPatternColumn
): column is FieldBasedIndexPatternColumn {
  return 'sourceField' in column;
}

export function isTermsField(column: GenericIndexPatternColumn): column is TermsIndexPatternColumn {
  return column.operationType === 'terms' && 'params' in column;
}

export function isCompatibleSplitFieldType(column: GenericIndexPatternColumn) {
  return COMPATIBLE_SPLIT_FIELD_TYPES.includes(column.dataType);
}

export function hasIncompatibleProperties(column: GenericIndexPatternColumn) {
  return 'timeShift' in column || 'filter' in column;
}

export function createDetectors(
  fields: FieldBasedIndexPatternColumn[],
  splitField: FieldBasedIndexPatternColumn | null
) {
  return fields.map(({ operationType, sourceField }) => {
    const func = getMlFunction(operationType);
    return {
      function: func,
      // don't use the source field if the detector is count
      ...(func === 'count' ? {} : { field_name: sourceField }),
      ...(splitField ? { partition_field_name: splitField.sourceField } : {}),
    };
  });
}
