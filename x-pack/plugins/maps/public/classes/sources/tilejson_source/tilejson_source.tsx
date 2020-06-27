/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import uuid from 'uuid/v4';
import React from 'react';
import { GeoJsonProperties } from 'geojson';
import { ImmutableSourceProperty, SourceEditorArgs } from '../source';
import { FIELD_ORIGIN, MAX_ZOOM, MIN_ZOOM, SOURCE_TYPES } from '../../../../common/constants';
import { registerSource } from '../source_registry';
import { getDataSourceLabel, getUrlLabel } from '../../../../common/i18n_getters';
import {
  TiledSingleLayerVectorSourceDescriptor,
  TileJsonVectorSourceDescriptor,
} from '../../../../common/descriptor_types';
import { MVTField } from '../../fields/mvt_field';
import { ITooltipProperty } from '../../tooltips/tooltip_property';
import { MVTSingleLayerVectorSource } from '../mvt_single_layer_vector_source';
import { loadTileJsonDocument } from './tilejon_loader_util';
import { TileJsonUpdateSourceEditor } from './tilejson_update_source_editor';
import { TileJsonField } from '../../fields/tilejson_field';

export const tilejsonSourceTitle = i18n.translate('xpack.maps.source.tileJsonSource.sourceTitle', {
  defaultMessage: 'TileJSON Layer',
});

export interface TileJsonVectorLayerConfig {
  id: string;
  description: string;
  minzoom: number;
  maxzoom: number;
  fields: Record<string, string>;
}

// todo: dont inherit, implement interface
export class TileJsonSource extends MVTSingleLayerVectorSource {
  static createDescriptor({
    url,
    layerName,
    tooltipProperties,
  }: Partial<TileJsonVectorSourceDescriptor>): TileJsonVectorSourceDescriptor {
    return {
      type: SOURCE_TYPES.TILEJSON_SINGLE_LAYER,
      id: uuid(),
      url: url ? url : '',
      layerName: layerName ? layerName : '',
      tooltipProperties: tooltipProperties ? tooltipProperties : [],
    };
  }

  static getLayerConfigsFromTileJson(tileJsonDoc: any): TileJsonVectorLayerConfig[] {
    return tileJsonDoc.vector_layers || [];
  }

  readonly _descriptor: TiledSingleLayerVectorSourceDescriptor;

  constructor(
    sourceDescriptor: TiledSingleLayerVectorSourceDescriptor,
    inspectorAdapters?: object
  ) {
    super(sourceDescriptor, inspectorAdapters);
    this._descriptor = TileJsonSource.createDescriptor(sourceDescriptor);

    // todo deal with tooltipProperties
  }

  renderSourceSettingsEditor({ onChange }: SourceEditorArgs) {
    return <TileJsonUpdateSourceEditor onChange={onChange} tooltipFields={[]} source={this} />;
  }

  getFieldNames(): string[] {
    return [];
  }

  getMVTFields(): MVTField[] {
    throw new Error('Cannot synchronously getMVTFieldNames');
  }

  // todo: breaks inheritance., shouldnt inherit from mvt_sinfle_layer
  getFieldByName(fieldName: string): TileJsonField | null {
    try {
      return this.createField({ fieldName });
    } catch (e) {
      return null;
    }
  }

  createField({ fieldName }: { fieldName: string }): TileJsonField {
    return new TileJsonField({
      fieldName,
      source: this,
      origin: FIELD_ORIGIN.SOURCE,
    });
  }

  async getFields(): Promise<TileJsonField[]> {
    const layer = await this.getLayerConfig();

    const fields = [];
    for (const key in layer.fields) {
      if (layer.fields.hasOwnProperty(key)) {
        const f = new TileJsonField({
          fieldName: key,
          source: this,
          origin: FIELD_ORIGIN.SOURCE,
        });
        fields.push(f);
      }
    }

    return fields;
  }

  getUrl(): string {
    return this._descriptor.url;
  }

  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
    return [
      { label: getDataSourceLabel(), value: tilejsonSourceTitle },
      { label: getUrlLabel(), value: this._descriptor.url },
      {
        label: i18n.translate('xpack.maps.source.tilejsonSource.layerNameMessage', {
          defaultMessage: 'Layer name',
        }),
        value: this._descriptor.layerName,
      },
    ];
  }

  async getLayerConfig(): Promise<TileJsonVectorLayerConfig> {
    const tileJsonDoc = await loadTileJsonDocument(this._descriptor.url);
    const layers = TileJsonSource.getLayerConfigsFromTileJson(tileJsonDoc);
    return layers.find((l) => l.id === this._descriptor.layerName);
  }
  async getUrlTemplateWithMeta() {
    const layer = await this.getLayerConfig();
    // todo: EMS does not preserve licesing param
    const tileJsonDoc = await loadTileJsonDocument(this._descriptor.url);
    const tileUrl = tileJsonDoc.tiles[0];
    return {
      urlTemplate: tileUrl,
      layerName: this._descriptor.layerName,
      minSourceZoom: layer.minzoom,
      maxSourceZoom: layer.maxzoom,
    };
  }

  getFeatureProperties(
    id: string | number | undefined,
    mbProperties: GeoJsonProperties
  ): GeoJsonProperties | null {
    return mbProperties;
  }

  getMinZoom() {
    return MIN_ZOOM;
  }

  getMaxZoom() {
    return MAX_ZOOM;
  }

  async filterAndFormatPropertiesToHtml(
    properties: GeoJsonProperties,
    featureId?: string | number
  ): Promise<ITooltipProperty[]> {
    // todo
    return [];
  }
}

registerSource({
  ConstructorFunction: TileJsonSource,
  type: SOURCE_TYPES.TILEJSON_SINGLE_LAYER,
});
