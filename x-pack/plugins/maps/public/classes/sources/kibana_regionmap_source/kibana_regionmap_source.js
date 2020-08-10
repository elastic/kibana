/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from '../vector_source';
import { getKibanaRegionList } from '../../../meta';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { FIELD_ORIGIN, SOURCE_TYPES } from '../../../../common/constants';
import { KibanaRegionField } from '../../fields/kibana_region_field';
import { registerSource } from '../source_registry';
import { getHttp } from '../../../kibana_services';
import _ from 'lodash';
import * as topojson from 'topojson-client';
import url from 'url';

export const sourceTitle = i18n.translate('xpack.maps.source.kbnRegionMapTitle', {
  defaultMessage: 'Configured GeoJSON',
});

export class KibanaRegionmapSource extends AbstractVectorSource {
  static type = SOURCE_TYPES.REGIONMAP_FILE;

  static createDescriptor({ name }) {
    return {
      type: KibanaRegionmapSource.type,
      name: name,
    };
  }

  createField({ fieldName }) {
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

  async getVectorFileMeta() {
    const regionList = getKibanaRegionList();
    const meta = regionList.find((source) => source.name === this._descriptor.name);
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
    return meta;
  }

  async getGeoJsonWithMeta() {
    const vectorFileMeta = await this.getVectorFileMeta();
    const featureCollection = await getGeoJson({
      format: vectorFileMeta.format.type,
      featureCollectionPath: vectorFileMeta.meta.feature_collection_path,
      fetchUrl: vectorFileMeta.url,
    });
    return {
      data: featureCollection,
    };
  }

  async getLeftJoinFields() {
    const vectorFileMeta = await this.getVectorFileMeta();
    return vectorFileMeta.fields.map((f) => this.createField({ fieldName: f.name }));
  }

  async getDisplayName() {
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

async function getGeoJson({ format, featureCollectionPath, fetchUrl }) {
  const http = getHttp();
  let fetchedJson;
  try {
    const parsedUrl = url.parse(fetchUrl, true);
    const rawUrl = url.format({
      protocol: parsedUrl.protocol,
      slashes: parsedUrl.slashes,
      auth: parsedUrl.auth,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      pathname: parsedUrl.pathname,
    });
    fetchedJson = await http.fetch(rawUrl, {
      method: 'GET',
      query: parsedUrl.query,
    });
  } catch (e) {
    throw new Error(
      i18n.translate('xpack.maps.source.vetorSource.requestFailedErrorMessage', {
        defaultMessage: `Unable to fetch vector shapes from url: {fetchUrl}`,
        values: { fetchUrl },
      })
    );
  }

  if (format === 'geojson') {
    return fetchedJson;
  }

  if (format === 'topojson') {
    const features = _.get(fetchedJson, `objects.${featureCollectionPath}`);
    return topojson.feature(fetchedJson, features);
  }

  throw new Error(
    i18n.translate('xpack.maps.source.vetorSource.formatErrorMessage', {
      defaultMessage: `Unable to fetch vector shapes from url: {format}`,
      values: { format },
    })
  );
}
