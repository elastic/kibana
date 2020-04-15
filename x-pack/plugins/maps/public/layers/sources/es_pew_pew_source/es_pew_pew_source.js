/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import uuid from 'uuid/v4';

import { VECTOR_SHAPE_TYPES } from '../vector_feature_types';
import { VectorLayer } from '../../vector_layer';
import { CreateSourceEditor } from './create_source_editor';
import { UpdateSourceEditor } from './update_source_editor';
import { VectorStyle } from '../../styles/vector/vector_style';
import { getDefaultDynamicProperties } from '../../styles/vector/vector_style_defaults';
import { i18n } from '@kbn/i18n';
import {
  FIELD_ORIGIN,
  SOURCE_TYPES,
  COUNT_PROP_NAME,
  VECTOR_STYLES,
} from '../../../../common/constants';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { convertToLines } from './convert_to_lines';
import { AbstractESAggSource } from '../es_agg_source';
import { DynamicStyleProperty } from '../../styles/vector/properties/dynamic_style_property';
import { COLOR_GRADIENTS } from '../../styles/color_utils';
import { indexPatterns } from '../../../../../../../src/plugins/data/public';
import { registerSource } from '../source_registry';

const MAX_GEOTILE_LEVEL = 29;

const sourceTitle = i18n.translate('xpack.maps.source.pewPewTitle', {
  defaultMessage: 'Point to point',
});

export class ESPewPewSource extends AbstractESAggSource {
  static type = SOURCE_TYPES.ES_PEW_PEW;

  static createDescriptor({ indexPatternId, sourceGeoField, destGeoField }) {
    return {
      type: ESPewPewSource.type,
      id: uuid(),
      indexPatternId: indexPatternId,
      sourceGeoField,
      destGeoField,
    };
  }

  renderSourceSettingsEditor({ onChange }) {
    return (
      <UpdateSourceEditor
        indexPatternId={this.getIndexPatternId()}
        onChange={onChange}
        metrics={this._descriptor.metrics}
        applyGlobalQuery={this._descriptor.applyGlobalQuery}
      />
    );
  }

  isFilterByMapBounds() {
    return true;
  }

  isJoinable() {
    return false;
  }

  isGeoGridPrecisionAware() {
    return true;
  }

  async getSupportedShapeTypes() {
    return [VECTOR_SHAPE_TYPES.LINE];
  }

  async getImmutableProperties() {
    let indexPatternTitle = this.getIndexPatternId();
    try {
      const indexPattern = await this.getIndexPattern();
      indexPatternTitle = indexPattern.title;
    } catch (error) {
      // ignore error, title will just default to id
    }

    return [
      {
        label: getDataSourceLabel(),
        value: sourceTitle,
      },
      {
        label: i18n.translate('xpack.maps.source.pewPew.indexPatternLabel', {
          defaultMessage: 'Index pattern',
        }),
        value: indexPatternTitle,
      },
      {
        label: i18n.translate('xpack.maps.source.pewPew.sourceGeoFieldLabel', {
          defaultMessage: 'Source',
        }),
        value: this._descriptor.sourceGeoField,
      },
      {
        label: i18n.translate('xpack.maps.source.pewPew.destGeoFieldLabel', {
          defaultMessage: 'Destination',
        }),
        value: this._descriptor.destGeoField,
      },
    ];
  }

  createDefaultLayer(options) {
    const defaultDynamicProperties = getDefaultDynamicProperties();
    const styleDescriptor = VectorStyle.createDescriptor({
      [VECTOR_STYLES.LINE_COLOR]: {
        type: DynamicStyleProperty.type,
        options: {
          ...defaultDynamicProperties[VECTOR_STYLES.LINE_COLOR].options,
          field: {
            name: COUNT_PROP_NAME,
            origin: FIELD_ORIGIN.SOURCE,
          },
          color: COLOR_GRADIENTS[0].value,
        },
      },
      [VECTOR_STYLES.LINE_WIDTH]: {
        type: DynamicStyleProperty.type,
        options: {
          ...defaultDynamicProperties[VECTOR_STYLES.LINE_WIDTH].options,
          field: {
            name: COUNT_PROP_NAME,
            origin: FIELD_ORIGIN.SOURCE,
          },
        },
      },
    });

    return new VectorLayer({
      layerDescriptor: VectorLayer.createDescriptor({
        ...options,
        sourceDescriptor: this._descriptor,
        style: styleDescriptor,
      }),
      source: this,
      style: new VectorStyle(styleDescriptor, this),
    });
  }

  getGeoGridPrecision(zoom) {
    const targetGeotileLevel = Math.ceil(zoom) + 2;
    return Math.min(targetGeotileLevel, MAX_GEOTILE_LEVEL);
  }

  async getGeoJsonWithMeta(layerName, searchFilters, registerCancelCallback) {
    const indexPattern = await this.getIndexPattern();
    const searchSource = await this.makeSearchSource(searchFilters, 0);
    searchSource.setField('aggs', {
      destSplit: {
        terms: {
          script: {
            source: `doc['${this._descriptor.destGeoField}'].value.toString()`,
            lang: 'painless',
          },
          order: {
            _count: 'desc',
          },
          size: 100,
        },
        aggs: {
          sourceGrid: {
            geotile_grid: {
              field: this._descriptor.sourceGeoField,
              precision: searchFilters.geogridPrecision,
              size: 500,
            },
            aggs: {
              sourceCentroid: {
                geo_centroid: {
                  field: this._descriptor.sourceGeoField,
                },
              },
              ...this.getValueAggsDsl(indexPattern),
            },
          },
        },
      },
    });

    const esResponse = await this._runEsQuery({
      requestId: this.getId(),
      requestName: layerName,
      searchSource,
      registerCancelCallback,
      requestDescription: i18n.translate('xpack.maps.source.pewPew.inspectorDescription', {
        defaultMessage: 'Source-destination connections request',
      }),
    });

    const { featureCollection } = convertToLines(esResponse);

    return {
      data: featureCollection,
      meta: {
        areResultsTrimmed: false,
      },
    };
  }

  async _getGeoField() {
    const indexPattern = await this.getIndexPattern();
    const field = indexPattern.fields.getByName(this._descriptor.destGeoField);
    const geoField = indexPatterns.isNestedField(field) ? undefined : field;
    if (!geoField) {
      throw new Error(
        i18n.translate('xpack.maps.source.esSource.noGeoFieldErrorMessage', {
          defaultMessage: `Index pattern {indexPatternTitle} no longer contains the geo field {geoField}`,
          values: { indexPatternTitle: indexPattern.title, geoField: this._descriptor.geoField },
        })
      );
    }
    return geoField;
  }

  canFormatFeatureProperties() {
    return true;
  }

  async filterAndFormatPropertiesToHtml(properties) {
    return await this.filterAndFormatPropertiesToHtmlForMetricFields(properties);
  }
}

registerSource({
  ConstructorFunction: ESPewPewSource,
  type: SOURCE_TYPES.ES_PEW_PEW,
});

export const point2PointLayerWizardConfig = {
  description: i18n.translate('xpack.maps.source.pewPewDescription', {
    defaultMessage: 'Aggregated data paths between the source and destination',
  }),
  icon: 'logoElasticsearch',
  renderWizard: ({ onPreviewSource, inspectorAdapters }) => {
    const onSourceConfigChange = sourceConfig => {
      if (!sourceConfig) {
        onPreviewSource(null);
        return;
      }

      const sourceDescriptor = ESPewPewSource.createDescriptor(sourceConfig);
      const source = new ESPewPewSource(sourceDescriptor, inspectorAdapters);
      onPreviewSource(source);
    };

    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
