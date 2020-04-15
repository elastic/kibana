/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from '../vector_source';
import React from 'react';
import {
  ES_GEO_FIELD_TYPE,
  SOURCE_TYPES,
  DEFAULT_MAX_RESULT_WINDOW,
  SCALING_TYPES,
} from '../../../../common/constants';
import { ClientFileCreateSourceEditor } from './create_client_file_source_editor';
import { ESSearchSource } from '../es_search_source';
import uuid from 'uuid/v4';
import { i18n } from '@kbn/i18n';
import { registerSource } from '../source_registry';

export class GeojsonFileSource extends AbstractVectorSource {
  static type = SOURCE_TYPES.GEOJSON_FILE;

  static isIndexingSource = true;

  static createDescriptor(geoJson, name) {
    // Wrap feature as feature collection if needed
    let featureCollection;

    if (!geoJson) {
      featureCollection = {
        type: 'FeatureCollection',
        features: [],
      };
    } else if (geoJson.type === 'FeatureCollection') {
      featureCollection = geoJson;
    } else if (geoJson.type === 'Feature') {
      featureCollection = {
        type: 'FeatureCollection',
        features: [geoJson],
      };
    } else {
      // Missing or incorrect type
      featureCollection = {
        type: 'FeatureCollection',
        features: [],
      };
    }

    return {
      type: GeojsonFileSource.type,
      __featureCollection: featureCollection,
      name,
    };
  }

  async getGeoJsonWithMeta() {
    return {
      data: this._descriptor.__featureCollection,
      meta: {},
    };
  }

  async getDisplayName() {
    return this._descriptor.name;
  }

  canFormatFeatureProperties() {
    return true;
  }

  shouldBeIndexed() {
    return GeojsonFileSource.isIndexingSource;
  }
}

const viewIndexedData = (
  addAndViewSource,
  inspectorAdapters,
  importSuccessHandler,
  importErrorHandler
) => {
  return (indexResponses = {}) => {
    const { indexDataResp, indexPatternResp } = indexResponses;

    const indexCreationFailed = !(indexDataResp && indexDataResp.success);
    const allDocsFailed = indexDataResp.failures.length === indexDataResp.docCount;
    const indexPatternCreationFailed = !(indexPatternResp && indexPatternResp.success);

    if (indexCreationFailed || allDocsFailed || indexPatternCreationFailed) {
      importErrorHandler(indexResponses);
      return;
    }
    const { fields, id: indexPatternId } = indexPatternResp;
    const geoField = fields.find(field => Object.values(ES_GEO_FIELD_TYPE).includes(field.type));
    if (!indexPatternId || !geoField) {
      addAndViewSource(null);
    } else {
      const source = new ESSearchSource(
        {
          id: uuid(),
          indexPatternId,
          geoField: geoField.name,
          // Only turn on bounds filter for large doc counts
          filterByMapBounds: indexDataResp.docCount > DEFAULT_MAX_RESULT_WINDOW,
          scalingType:
            geoField.type === ES_GEO_FIELD_TYPE.GEO_POINT
              ? SCALING_TYPES.CLUSTERS
              : SCALING_TYPES.LIMIT,
        },
        inspectorAdapters
      );
      addAndViewSource(source);
      importSuccessHandler(indexResponses);
    }
  };
};

const previewGeojsonFile = (onPreviewSource, inspectorAdapters) => {
  return (geojsonFile, name) => {
    if (!geojsonFile) {
      onPreviewSource(null);
      return;
    }
    const sourceDescriptor = GeojsonFileSource.createDescriptor(geojsonFile, name);
    const source = new GeojsonFileSource(sourceDescriptor, inspectorAdapters);
    onPreviewSource(source);
  };
};

registerSource({
  ConstructorFunction: GeojsonFileSource,
  type: SOURCE_TYPES.GEOJSON_FILE,
});

export const uploadLayerWizardConfig = {
  description: i18n.translate('xpack.maps.source.geojsonFileDescription', {
    defaultMessage: 'Index GeoJSON data in Elasticsearch',
  }),
  icon: 'importAction',
  isIndexingSource: true,
  renderWizard: ({
    onPreviewSource,
    inspectorAdapters,
    addAndViewSource,
    isIndexingTriggered,
    onRemove,
    onIndexReady,
    importSuccessHandler,
    importErrorHandler,
  }) => {
    return (
      <ClientFileCreateSourceEditor
        previewGeojsonFile={previewGeojsonFile(onPreviewSource, inspectorAdapters)}
        isIndexingTriggered={isIndexingTriggered}
        onIndexingComplete={viewIndexedData(
          addAndViewSource,
          inspectorAdapters,
          importSuccessHandler,
          importErrorHandler
        )}
        onRemove={onRemove}
        onIndexReady={onIndexReady}
      />
    );
  },
  title: i18n.translate('xpack.maps.source.geojsonFileTitle', {
    defaultMessage: 'Upload GeoJSON',
  }),
};
