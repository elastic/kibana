/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Feature } from 'geojson';
import { i18n } from '@kbn/i18n';
// @ts-expect-error
import { JSONLoader, loadInBatches } from '../loaders';
import type { ImportFailure } from '../../../../common/types';
import { AbstractGeoFileImporter } from '../abstract_geo_file_importer';

export const GEOJSON_FILE_TYPES = ['.json', '.geojson'];

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
      this._iterator = await loadInBatches(this._getFile(), JSONLoader, {
        json: {
          jsonpaths: ['$.features'],
          _rootObjectBatches: true,
        },
      });
    }

    if (!this._getIsActive() || !this._iterator) {
      results.hasNext = false;
      return results;
    }

    const { value: batch, done } = await this._iterator.next();

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
      if (featureIndex === 0) {
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
