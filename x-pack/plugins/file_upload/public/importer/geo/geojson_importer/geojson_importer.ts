/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Feature } from 'geojson';
import { i18n } from '@kbn/i18n';
// @ts-expect-error
import { JSONLoader, loadInBatches } from './loaders';
// @ts-expect-error
import { geoJsonCleanAndValidate } from './geojson_clean_and_validate';
import type { ImportFailure } from '../../../../common/types';
import { AbstractGeoFileImporter } from '../abstract_geo_file_importer';

export const GEOJSON_FILE_TYPES = ['.json', '.geojson'];

export class GeoJsonImporter extends AbstractGeoFileImporter {
  private _iterator?: Iterator<unknown>;
  private _prevBatchLastFeature?: Feature;

  protected async _readNext(prevTotalFeaturesRead: number, prevTotalBytesRead: number) {
    let featureIndex = prevTotalFeaturesRead;
    const results = {
      bytesRead: 0,
      features: [] as Feature[],
      geometryTypesMap: new Map<string, boolean>(),
      invalidFeatures: [] as ImportFailure[],
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
      return results;
    }

    const { value: batch, done } = await this._iterator.next();

    if (!this._getIsActive() || done) {
      this._done();
      return results;
    }

    if ('bytesUsed' in batch) {
      results.bytesRead = batch.bytesUsed - prevTotalBytesRead;
    }

    const rawFeatures: unknown[] = this._prevBatchLastFeature ? [this._prevBatchLastFeature] : [];
    this._prevBatchLastFeature = undefined;
    const isLastBatch = batch.batchType === 'root-object-batch-complete';
    if (isLastBatch) {
      // Handle single feature geoJson
      if (featureIndex === 0) {
        rawFeatures.push(batch.container);
      }
    } else {
      rawFeatures.push(...batch.data);
    }

    for (let i = 0; i < rawFeatures.length; i++) {
      const rawFeature = rawFeatures[i] as Feature;
      if (!isLastBatch && i === rawFeatures.length - 1) {
        // Do not process last feature until next batch is read, features on batch boundary may be incomplete.
        this._prevBatchLastFeature = rawFeature;
        continue;
      }

      featureIndex++;
      if (!rawFeature.geometry || !rawFeature.geometry.type) {
        results.invalidFeatures.push({
          item: featureIndex,
          reason: i18n.translate('xpack.fileUpload.geojsonImporter.noGeometry', {
            defaultMessage: 'Feature does not contain required field "geometry"',
          }),
          doc: rawFeature,
        });
      } else {
        if (!results.geometryTypesMap.has(rawFeature.geometry.type)) {
          results.geometryTypesMap.set(rawFeature.geometry.type, true);
        }
        results.features.push(geoJsonCleanAndValidate(rawFeature));
      }
    }

    return results;
  }
}
