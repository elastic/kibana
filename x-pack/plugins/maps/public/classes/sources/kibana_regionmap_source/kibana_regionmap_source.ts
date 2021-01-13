/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AbstractVectorSource, GeoJsonWithMeta } from '../vector_source';
import { getKibanaRegionList } from '../../../meta';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { FIELD_ORIGIN, FORMAT_TYPE, SOURCE_TYPES } from '../../../../common/constants';
import { KibanaRegionField } from '../../fields/kibana_region_field';
import { registerSource } from '../source_registry';
import { KibanaRegionmapSourceDescriptor } from '../../../../common/descriptor_types/source_descriptor_types';
import { Adapters } from '../../../../../../../src/plugins/inspector/common/adapters';
import { IField } from '../../fields/field';
import { LayerConfig } from '../../../../../../../src/plugins/maps_legacy/config';

export const sourceTitle = i18n.translate('xpack.maps.source.kbnRegionMapTitle', {
  defaultMessage: 'Configured GeoJSON',
});

export class KibanaRegionmapSource extends AbstractVectorSource {
  readonly _descriptor: KibanaRegionmapSourceDescriptor;

  static createDescriptor({ name }: { name: string }): KibanaRegionmapSourceDescriptor {
    return {
      type: SOURCE_TYPES.REGIONMAP_FILE,
      name,
    };
  }

  constructor(descriptor: KibanaRegionmapSourceDescriptor, inspectorAdapters?: Adapters) {
    super(descriptor, inspectorAdapters);
    this._descriptor = descriptor;
  }

  createField({ fieldName }: { fieldName: string }): KibanaRegionField {
    return new KibanaRegionField({
      fieldName,
      source: this,
      origin: FIELD_ORIGIN.SOURCE,
    });
  }

  async getImmutableProperties() {
    return [
      {
        label: getDataSourceLabel(),
        value: sourceTitle,
      },
      {
        label: i18n.translate('xpack.maps.source.kbnRegionMap.vectorLayerLabel', {
          defaultMessage: 'Vector layer',
        }),
        value: this._descriptor.name,
      },
    ];
  }

  async getVectorFileMeta(): Promise<LayerConfig> {
    const regionList: LayerConfig[] = getKibanaRegionList();
    const layerConfig: LayerConfig | undefined = regionList.find(
      (regionConfig: LayerConfig) => regionConfig.name === this._descriptor.name
    );
    if (!layerConfig) {
      throw new Error(
        i18n.translate('xpack.maps.source.kbnRegionMap.noConfigErrorMessage', {
          defaultMessage: `Unable to find map.regionmap configuration for {name}`,
          values: {
            name: this._descriptor.name,
          },
        })
      );
    }
    return layerConfig;
  }

  async getGeoJsonWithMeta(): Promise<GeoJsonWithMeta> {
    const vectorFileMeta = await this.getVectorFileMeta();
    const featureCollection = await AbstractVectorSource.getGeoJson({
      format: vectorFileMeta.format.type as FORMAT_TYPE,
      featureCollectionPath: vectorFileMeta.meta.feature_collection_path,
      fetchUrl: vectorFileMeta.url,
    });
    return {
      data: featureCollection,
      meta: {},
    };
  }

  async getLeftJoinFields(): Promise<IField[]> {
    const vectorFileMeta: LayerConfig = await this.getVectorFileMeta();
    return vectorFileMeta.fields.map(
      (field): KibanaRegionField => {
        return this.createField({ fieldName: field.name });
      }
    );
  }

  async getDisplayName(): Promise<string> {
    return this._descriptor.name;
  }

  canFormatFeatureProperties() {
    return true;
  }
}

registerSource({
  ConstructorFunction: KibanaRegionmapSource,
  type: SOURCE_TYPES.REGIONMAP_FILE,
});
