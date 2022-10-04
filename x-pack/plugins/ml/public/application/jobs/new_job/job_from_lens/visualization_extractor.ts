/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';

import type {
  Embeddable,
  LensPublicStart,
  LensSavedObjectAttributes,
  FieldBasedIndexPatternColumn,
  XYDataLayerConfig,
  FormBasedPersistedState,
  FormBasedLayer,
  XYLayerConfig,
} from '@kbn/lens-plugin/public';
import { layerTypes } from '@kbn/lens-plugin/public';

import { i18n } from '@kbn/i18n';

import { JOB_TYPE } from '../../../../../common/constants/new_job';
import { ErrorType } from '../../../../../common/util/errors';
import {
  getVisTypeFactory,
  isCompatibleLayer,
  hasIncompatibleProperties,
  hasSourceField,
  isTermsField,
  isCompatibleSplitFieldType,
  getMlFunction,
  getJobsItemsFromEmbeddable,
  createDetectors,
} from './utils';

type VisualizationType = Awaited<ReturnType<LensPublicStart['getXyVisTypes']>>[number];

export interface LayerResult {
  id: string;
  layerType: typeof layerTypes[keyof typeof layerTypes];
  label: string;
  icon: VisualizationType['icon'];
  isCompatible: boolean;
  jobType: JOB_TYPE | null;
  error?: ErrorType;
}

export class VisualizationExtractor {
  constructor(private dataViewClient: DataViewsContract) {}

  public async getResultLayersFromEmbeddable(
    embeddable: Embeddable,
    lens: LensPublicStart
  ): Promise<LayerResult[]> {
    const { vis } = getJobsItemsFromEmbeddable(embeddable);
    return this.getLayers(vis, lens);
  }

  public async extractFields(layer: XYLayerConfig, vis: LensSavedObjectAttributes) {
    if (!isCompatibleLayer(layer)) {
      throw Error(
        i18n.translate('xpack.ml.newJob.fromLens.createJob.error.incompatibleLayerType', {
          defaultMessage: 'Layer is incompatible. Only chart layers can be used.',
        })
      );
    }

    const indexpattern = vis.state.datasourceStates.formBased as FormBasedPersistedState;
    const compatibleIndexPatternLayer = Object.entries(indexpattern.layers).find(
      ([id]) => layer.layerId === id
    );
    if (compatibleIndexPatternLayer === undefined) {
      throw Error(
        i18n.translate('xpack.ml.newJob.fromLens.createJob.error.noCompatibleLayers', {
          defaultMessage:
            'Visualization does not contain any layers which can be used for creating an anomaly detection job.',
        })
      );
    }

    const [layerId, columnsLayer] = compatibleIndexPatternLayer;

    const columns = getColumns(columnsLayer, layer);
    const timeField = Object.values(columns).find(({ dataType }) => dataType === 'date');
    if (timeField === undefined) {
      throw Error(
        i18n.translate('xpack.ml.newJob.fromLens.createJob.error.noDateField', {
          defaultMessage: 'Cannot find a date field.',
        })
      );
    }

    const fields = layer.accessors.map((a) => columns[a]);

    const splitField = layer.splitAccessor ? columns[layer.splitAccessor] : null;

    if (
      splitField !== null &&
      isTermsField(splitField) &&
      splitField.params.secondaryFields?.length
    ) {
      throw Error(
        i18n.translate('xpack.ml.newJob.fromLens.createJob.error.splitFieldHasMultipleFields', {
          defaultMessage: 'Selected split field contains more than one field.',
        })
      );
    }

    if (splitField !== null && isCompatibleSplitFieldType(splitField) === false) {
      throw Error(
        i18n.translate('xpack.ml.newJob.fromLens.createJob.error.splitFieldMustBeString', {
          defaultMessage: 'Selected split field type must be string.',
        })
      );
    }

    const dataView = await this.getDataViewFromLens(vis.references, layerId);
    if (dataView === null) {
      throw Error(
        i18n.translate('xpack.ml.newJob.fromLens.createJob.error.noDataViews', {
          defaultMessage: 'No data views can be found in the visualization.',
        })
      );
    }

    if (timeField.sourceField !== dataView.timeFieldName) {
      throw Error(
        i18n.translate('xpack.ml.newJob.fromLens.createJob.error.timeFieldNotInDataView', {
          defaultMessage:
            'Selected time field must be the default time field configured for data view.',
        })
      );
    }

    return { fields, timeField, splitField, dataView };
  }

  private async getLayers(
    vis: LensSavedObjectAttributes,
    lens: LensPublicStart
  ): Promise<LayerResult[]> {
    const visualization = vis.state.visualization as { layers: XYLayerConfig[] };
    const getVisType = await getVisTypeFactory(lens);

    const layers: LayerResult[] = await Promise.all(
      visualization.layers
        .filter(({ layerType }) => layerType === layerTypes.DATA) // remove non chart layers
        .map(async (layer) => {
          const { icon, label } = getVisType(layer);
          try {
            const { fields, splitField } = await this.extractFields(layer, vis);
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

  private async getDataViewFromLens(references: SavedObjectReference[], layerId: string) {
    const dv = references.find(
      (r) => r.type === 'index-pattern' && r.name === `indexpattern-datasource-layer-${layerId}`
    );
    if (!dv) {
      return null;
    }
    return this.dataViewClient.get(dv.id);
  }
}

function getColumns({ columns }: Omit<FormBasedLayer, 'indexPatternId'>, layer: XYDataLayerConfig) {
  layer.accessors.forEach((a) => {
    const col = columns[a];
    // fail early if any of the cols being used as accessors
    // contain functions we don't support
    return col.dataType !== 'date' && getMlFunction(col.operationType);
  });

  if (Object.values(columns).some((c) => hasSourceField(c) === false)) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromLens.createJob.error.colsNoSourceField', {
        defaultMessage: 'Some columns do not contain a source field.',
      })
    );
  }

  if (Object.values(columns).some((c) => hasIncompatibleProperties(c) === true)) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromLens.createJob.error.colsUsingFilterTimeSift', {
        defaultMessage:
          'Columns contain settings which are incompatible with ML detectors, time shift and filter by are not supported.',
      })
    );
  }

  return columns as Record<string, FieldBasedIndexPatternColumn>;
}
