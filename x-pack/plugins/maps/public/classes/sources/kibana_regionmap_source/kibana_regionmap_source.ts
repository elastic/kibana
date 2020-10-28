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

export const sourceTitle = i18n.translate('xpack.maps.source.kbnRegionMapTitle', {
  defaultMessage: 'Configured GeoJSON',
});

import { KibanaRegionmapSourceDescriptor } from '../../../../common/descriptor_types/source_descriptor_types';
import { Adapters } from '../../../../../../../src/plugins/inspector/common/adapters';
import { IField } from '../../fields/field';

interface VectorFileField {
  name: string;
  description: string;
}

interface VectorFileMeta {
  url: string;
  format: {
    type: FORMAT_TYPE;
  };
  meta: {};
  fields: VectorFileField[];
}

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

  async getVectorFileMeta(): Promise<VectorFileMeta> {
    const regionList: any[] = getKibanaRegionList();
    const meta: VectorFileMeta | undefined = regionList.find(
      (regionConfig: any) => (regionConfig.name as string) === this._descriptor.name
    );
    if (!meta) {
      throw new Error(
        i18n.translate('xpack.maps.source.kbnRegionMap.noConfigErrorMessage', {
          defaultMessage: `Unable to find map.regionmap configuration for {name}`,
          values: {
            name: this._descriptor.name,
          },
        })
      );
    }
    return meta as VectorFileMeta;
  }

  async getGeoJsonWithMeta(): Promise<GeoJsonWithMeta> {
    const vectorFileMeta: VectorFileMeta = await this.getVectorFileMeta();
    const featureCollection = await AbstractVectorSource.getGeoJson({
      format: (vectorFileMeta.format as any).type as FORMAT_TYPE,
      featureCollectionPath: (vectorFileMeta.meta as any).feature_collection_path as string,
      fetchUrl: vectorFileMeta.url as string,
    });
    return {
      data: featureCollection,
      meta: {},
    };
  }

  async getLeftJoinFields(): Promise<IField[]> {
    const vectorFileMeta: VectorFileMeta = await this.getVectorFileMeta();
    return vectorFileMeta.fields.map(
      (field: VectorFileField): KibanaRegionField => {
        return this.createField({ fieldName: field.name }) as KibanaRegionField;
      }
    ) as KibanaRegionField[];
  }

  async getDisplayName(): Promise<string> {
    return this._descriptor.name;
  }

  async isTimeAware() {
    return false;
  }

  canFormatFeatureProperties() {
    return true;
  }
}

registerSource({
  ConstructorFunction: KibanaRegionmapSource,
  type: SOURCE_TYPES.REGIONMAP_FILE,
});
