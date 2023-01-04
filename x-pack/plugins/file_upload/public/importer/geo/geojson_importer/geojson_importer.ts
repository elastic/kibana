/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Feature } from 'geojson';
import { i18n } from '@kbn/i18n';
import { JSONLoader, loadInBatches } from '../loaders';
import type { ImportFailure } from '../../../../common/types';
import { AbstractGeoFileImporter } from '../abstract_geo_file_importer';

export const GEOJSON_FILE_TYPES = ['.json', '.geojson'];

const SUPPORTED_CRS_LIST = ['EPSG:4326', 'urn:ogc:def:crs:OGC:1.3:CRS84'];

interface LoaderBatch {
  bytesUsed?: number;
  batchType?: string;
  container?: Feature;
  data?: Feature[];
}

export class GeoJsonImporter extends AbstractGeoFileImporter {
  private _iterator?: AsyncIterator<LoaderBatch>;
  private _prevBatchLastFeature?: Feature;

  protected async _readNext(prevTotalFeaturesRead: number, prevTotalBytesRead: number) {
    let featureIndex = prevTotalFeaturesRead;
    const results = {
      bytesRead: 0,
      features: [] as Feature[],
      geometryTypesMap: new Map<string, boolean>(),
      invalidFeatures: [] as ImportFailure[],
      hasNext: true,
    };

    if (this._iterator === undefined) {
      // TODO: loadInBatches returns an AsyncIterable, not an AsyncInterator, which doesn't necessarily have a .next() function
      this._iterator = (await loadInBatches(this._getFile(), JSONLoader, {
        json: {
          jsonpaths: ['$.features'],
          _rootObjectBatches: true,
        },
      })) as any;
    }

    if (!this._getIsActive() || !this._iterator) {
      results.hasNext = false;
      return results;
    }

    const { value: batch, done } = await this._iterator.next();

    // geojson only supports WGS 84 datum, with longitude and latitude units of decimal degrees.
    // https://datatracker.ietf.org/doc/html/rfc7946#section-4
    // Deprecated geojson specification supported crs
    // https://geojson.org/geojson-spec.html#named-crs
    // This importer only supports WGS 84 datum
    if (typeof batch?.container?.crs === 'object') {
      const crs = batch.container.crs as { type?: string; properties?: { name?: string } };
      if (
        crs?.type === 'link' ||
        (crs?.type === 'name' && !SUPPORTED_CRS_LIST.includes(crs?.properties?.name ?? ''))
      ) {
        throw new Error(
          i18n.translate('xpack.fileUpload.geojsonImporter.unsupportedCrs', {
            defaultMessage: 'Unsupported coordinate reference system, expecting {supportedCrsList}',
            values: {
              supportedCrsList: SUPPORTED_CRS_LIST.join(', '),
            },
          })
        );
      }
    }

    if (!this._getIsActive() || done) {
      results.hasNext = false;
      return results;
    }

    if (batch.bytesUsed) {
      results.bytesRead = batch.bytesUsed - prevTotalBytesRead;
    }

    const features: Feature[] = this._prevBatchLastFeature ? [this._prevBatchLastFeature] : [];
    this._prevBatchLastFeature = undefined;
    const isLastBatch = batch.batchType === 'root-object-batch-complete';
    if (isLastBatch) {
      // Handle single feature geoJson
      if (featureIndex === 0 && features.length === 0) {
        if (batch.container) {
          features.push(batch.container);
        }
      }
    } else {
      if (batch.data) {
        features.push(...batch.data);
      }
    }

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      if (!isLastBatch && i === features.length - 1) {
        // Do not process last feature until next batch is read, features on batch boundary may be incomplete.
        this._prevBatchLastFeature = feature;
        continue;
      }

      featureIndex++;
      if (!feature.geometry || !feature.geometry.type) {
        results.invalidFeatures.push({
          item: featureIndex,
          reason: i18n.translate('xpack.fileUpload.geojsonImporter.noGeometry', {
            defaultMessage: 'Feature does not contain required field "geometry"',
          }),
          doc: feature,
        });
      } else {
        if (!results.geometryTypesMap.has(feature.geometry.type)) {
          results.geometryTypesMap.set(feature.geometry.type, true);
        }
        results.features.push(feature);
      }
    }

    return results;
  }
}
