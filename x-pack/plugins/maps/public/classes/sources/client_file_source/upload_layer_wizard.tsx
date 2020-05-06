/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { IFieldType } from 'src/plugins/data/public';
import {
  ES_GEO_FIELD_TYPE,
  DEFAULT_MAX_RESULT_WINDOW,
  SCALING_TYPES,
} from '../../../../common/constants';
// @ts-ignore
import { ESSearchSource, createDefaultLayerDescriptor } from '../es_search_source';
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';
// @ts-ignore
import { ClientFileCreateSourceEditor } from './create_client_file_source_editor';
// @ts-ignore
import { GeojsonFileSource } from './geojson_file_source';
import { VectorLayer } from '../../vector_layer';

export const uploadLayerWizardConfig: LayerWizard = {
  description: i18n.translate('xpack.maps.source.geojsonFileDescription', {
    defaultMessage: 'Index GeoJSON data in Elasticsearch',
  }),
  icon: 'importAction',
  isIndexingSource: true,
  renderWizard: ({
    previewLayer,
    mapColors,
    isIndexingTriggered,
    onRemove,
    onIndexReady,
    importSuccessHandler,
    importErrorHandler,
  }: RenderWizardArguments) => {
    function previewGeojsonFile(geojsonFile: unknown, name: string) {
      if (!geojsonFile) {
        previewLayer(null);
        return;
      }
      const sourceDescriptor = GeojsonFileSource.createDescriptor(geojsonFile, name);
      const layerDescriptor = VectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
      // TODO figure out a better way to handle passing this information back to layer_addpanel
      previewLayer(layerDescriptor, true);
    }

    function viewIndexedData(indexResponses: {
      indexDataResp: unknown;
      indexPatternResp: unknown;
    }) {
      const { indexDataResp, indexPatternResp } = indexResponses;

      // @ts-ignore
      const indexCreationFailed = !(indexDataResp && indexDataResp.success);
      // @ts-ignore
      const allDocsFailed = indexDataResp.failures.length === indexDataResp.docCount;
      // @ts-ignore
      const indexPatternCreationFailed = !(indexPatternResp && indexPatternResp.success);

      if (indexCreationFailed || allDocsFailed || indexPatternCreationFailed) {
        importErrorHandler(indexResponses);
        return;
      }
      // @ts-ignore
      const { fields, id: indexPatternId } = indexPatternResp;
      const geoField = fields.find((field: IFieldType) =>
        [ES_GEO_FIELD_TYPE.GEO_POINT as string, ES_GEO_FIELD_TYPE.GEO_SHAPE as string].includes(
          field.type
        )
      );
      if (!indexPatternId || !geoField) {
        previewLayer(null);
      } else {
        const esSearchSourceConfig = {
          indexPatternId,
          geoField: geoField.name,
          // Only turn on bounds filter for large doc counts
          // @ts-ignore
          filterByMapBounds: indexDataResp.docCount > DEFAULT_MAX_RESULT_WINDOW,
          scalingType:
            geoField.type === ES_GEO_FIELD_TYPE.GEO_POINT
              ? SCALING_TYPES.CLUSTERS
              : SCALING_TYPES.LIMIT,
        };
        previewLayer(createDefaultLayerDescriptor(esSearchSourceConfig, mapColors));
        importSuccessHandler(indexResponses);
      }
    }

    return (
      <ClientFileCreateSourceEditor
        previewGeojsonFile={previewGeojsonFile}
        isIndexingTriggered={isIndexingTriggered}
        onIndexingComplete={viewIndexedData}
        onRemove={onRemove}
        onIndexReady={onIndexReady}
      />
    );
  },
  title: i18n.translate('xpack.maps.source.geojsonFileTitle', {
    defaultMessage: 'Upload GeoJSON',
  }),
};
