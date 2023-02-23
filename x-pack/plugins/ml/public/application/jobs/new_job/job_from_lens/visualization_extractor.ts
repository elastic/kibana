/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Embeddable, LensPublicStart, ChartInfo } from '@kbn/lens-plugin/public';
import { layerTypes } from '@kbn/lens-plugin/public';

import { i18n } from '@kbn/i18n';

import { JOB_TYPE } from '../../../../../common/constants/new_job';
import { ErrorType } from '../../../../../common/util/errors';
import {
  getVisTypeFactory,
  isCompatibleLayer,
  hasIncompatibleProperties,
  isTermsField,
  isCompatibleSplitFieldType,
  getMlFunction,
  getJobsItemsFromEmbeddable,
  createDetectors,
} from './utils';

type VisualizationType = Awaited<ReturnType<LensPublicStart['getXyVisTypes']>>[number];

export interface LayerResult {
  id: string;
  layerType: string;
  label: string;
  icon: VisualizationType['icon'];
  isCompatible: boolean;
  jobType: JOB_TYPE | null;
  error?: ErrorType;
}

export class VisualizationExtractor {
  constructor() {}

  public async getResultLayersFromEmbeddable(
    embeddable: Embeddable,
    lens: LensPublicStart
  ): Promise<LayerResult[]> {
    const { chartInfo } = await getJobsItemsFromEmbeddable(embeddable, lens);
    return this.getLayers(chartInfo, lens);
  }

  public async extractFields(layer: ChartInfo['layers'][number]) {
    if (!isCompatibleLayer(layer)) {
      throw Error(
        i18n.translate('xpack.ml.newJob.fromLens.createJob.error.incompatibleLayerType', {
          defaultMessage: 'Layer is incompatible. Only chart layers can be used.',
        })
      );
    }

    const timeField = layer.dimensions.find(({ operation }) => operation.dataType === 'date');
    if (timeField === undefined || !timeField.operation.fields?.length) {
      throw Error(
        i18n.translate('xpack.ml.newJob.fromLens.createJob.error.noDateField', {
          defaultMessage: 'Cannot find a date field.',
        })
      );
    }

    const metricFields = layer.dimensions.filter((dimension) => dimension.role === 'metric');

    validateDimensions(metricFields);

    const splitField = layer.dimensions.find(
      (dimension) => dimension.role === 'split' && dimension.dimensionType === 'breakdown'
    );

    if (
      splitField &&
      isTermsField(splitField) &&
      splitField.operation.fields &&
      splitField.operation.fields.length > 1
    ) {
      throw Error(
        i18n.translate('xpack.ml.newJob.fromLens.createJob.error.splitFieldHasMultipleFields', {
          defaultMessage: 'Selected split field contains more than one field.',
        })
      );
    }

    if (splitField && !isCompatibleSplitFieldType(splitField)) {
      throw Error(
        i18n.translate('xpack.ml.newJob.fromLens.createJob.error.splitFieldMustBeString', {
          defaultMessage: 'Selected split field type must be string.',
        })
      );
    }

    if (!layer.dataView) {
      throw Error(
        i18n.translate('xpack.ml.newJob.fromLens.createJob.error.noDataViews', {
          defaultMessage: 'No data views can be found in the visualization.',
        })
      );
    }

    if (timeField.operation.fields[0] !== layer.dataView.timeFieldName) {
      throw Error(
        i18n.translate('xpack.ml.newJob.fromLens.createJob.error.timeFieldNotInDataView', {
          defaultMessage:
            'Selected time field must be the default time field configured for data view.',
        })
      );
    }

    return { fields: metricFields, timeField, splitField, dataView: layer.dataView };
  }

  private async getLayers(chartInfo: ChartInfo, lens: LensPublicStart): Promise<LayerResult[]> {
    const getVisType = await getVisTypeFactory(lens);

    const layers: LayerResult[] = await Promise.all(
      chartInfo.layers
        .filter(({ layerType }) => layerType === layerTypes.DATA) // remove non chart layers
        .map(async (layer) => {
          const { icon, label } = getVisType(layer);
          try {
            const { fields, splitField } = await this.extractFields(layer);
            const detectors = createDetectors(fields, splitField);
            const jobType =
              splitField || detectors.length > 1 ? JOB_TYPE.MULTI_METRIC : JOB_TYPE.SINGLE_METRIC;

            return {
              id: layer.layerId,
              layerType: layer.layerType,
              label,
              icon,
              jobType,
              isCompatible: true,
            };
          } catch (error) {
            return {
              id: layer.layerId,
              layerType: layer.layerType,
              label,
              icon,
              jobType: null,
              isCompatible: false,
              error,
            };
          }
        })
    );

    return layers;
  }
}

function validateDimensions(dimensions: ChartInfo['layers'][number]['dimensions']) {
  dimensions.forEach((dimension) => {
    // fail early if any of the cols being used as accessors
    // contain functions we don't support
    return dimension.operation.dataType !== 'date' && getMlFunction(dimension.operation.type);
  });

  if (dimensions.some((dimension) => !dimension.operation.fields?.length)) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromLens.createJob.error.colsNoSourceField', {
        defaultMessage: 'Some columns do not contain a source field.',
      })
    );
  }

  if (dimensions.some((dimension) => hasIncompatibleProperties(dimension))) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromLens.createJob.error.colsUsingFilterTimeSift', {
        defaultMessage:
          'Columns contain settings which are incompatible with ML detectors, time shift and filter by are not supported.',
      })
    );
  }
}
