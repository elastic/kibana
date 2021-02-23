/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import {
  Feature,
  FeatureCollection,
  Point,
  MultiPoint,
  LineString,
  MultiLineString,
  Polygon,
  MultiPolygon,
} from 'geojson';
import { i18n } from '@kbn/i18n';
// @ts-expect-error
import { JSONLoader, loadInBatches } from './loaders';
import { CreateDocsResponse } from '../types';
import { Importer } from '../importer';
import { ES_FIELD_TYPES } from '../../../../../../src/plugins/data/public';
// @ts-expect-error
import { geoJsonCleanAndValidate } from './geojson_clean_and_validate';
import { validateFile } from '../validate_file';

export const GEOJSON_FILE_TYPES = ['.json', '.geojson'];

export class GeoJsonImporter extends Importer {
  private _file: File;
  private _isActive = true;
  private _iterator?: Iterator;
  private _hasNext = true;
  private _features: Feature[] = [];
  private _totalBytesProcessed = 0;
  private _unimportedBytesProcessed = 0;
  private _totalFeatures = 0;
  private _geometryTypesMap = new Map<string, boolean>();
  private _invalidCount = 0;
  private _prevBatchLastFeature?: Feature;

  constructor(file: File) {
    super();

    validateFile(file, GEOJSON_FILE_TYPES);
    this._file = file;
  }

  public destroy() {
    this._isActive = false;
  }

  public async previewFile(
    rowLimit?: number,
    sizeLimit?: number
  ): { features: Feature[]; geoFieldTypes: string[]; previewCoverage: number } {
    await this._readUntil(rowLimit, sizeLimit);
    return {
      features: [...this._features],
      previewCoverage: (this._unimportedBytesProcessed / this._file.size) * 100,
      geoFieldTypes:
        this._geometryTypesMap.has('Point') || this._geometryTypesMap.has('MultiPoint')
          ? [ES_FIELD_TYPES.GEO_POINT, ES_FIELD_TYPES.GEO_SHAPE]
          : [ES_FIELD_TYPES.GEO_SHAPE],
    };
  }

  private async _readUntil(rowLimit?: number, sizeLimit?: number) {
    while (
      this._isActive &&
      this._hasNext &&
      (rowLimit === undefined || this._features.length < rowLimit) &&
      (sizeLimit === undefined || this._unimportedBytesProcessed < sizeLimit)
    ) {
      await this._next();
    }
  }

  private async _next() {
    if (this._iterator === undefined) {
      this._iterator = await loadInBatches(this._file, JSONLoader, {
        json: {
          jsonpaths: ['$.features'],
          _rootObjectBatches: true,
        },
      });
    }

    if (!this._isActive) {
      return;
    }

    const { value: batch, done } = await this._iterator.next();

    if (!this._isActive || done) {
      this._hasNext = false;
      return;
    }

    if ('bytesUsed' in batch) {
      const bytesRead = batch.bytesUsed - this._totalBytesProcessed;
      this._unimportedBytesProcessed += bytesRead;
      this._totalBytesProcessed = batch.bytesUsed;
    }

    const rawFeatures: unknown[] = this._prevBatchLastFeature ? [this._prevBatchLastFeature] : [];
    this._prevBatchLastFeature = undefined;
    const isLastBatch = batch.batchType === 'root-object-batch-complete';
    if (isLastBatch) {
      // Handle single feature geoJson
      if (this._totalFeatures === 0) {
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

      this._totalFeatures++;
      if (!rawFeature.geometry || !rawFeature.geometry.type) {
        this._invalidCount++;
      } else {
        if (!this._geometryTypesMap.has(rawFeature.geometry.type)) {
          this._geometryTypesMap.set(rawFeature.geometry.type, true);
        }
        this._features.push(geoJsonCleanAndValidate(rawFeature));
      }
    }
  }

  public read(data: ArrayBuffer): { success: boolean } {
    throw new Error('read(data: ArrayBuffer) not supported, use readFile instead.');
  }

  protected _createDocs(text: string): CreateDocsResponse {
    throw new Error('_createDocs not implemented.');
  }

  public getDocs() {
    return this._docArray;
  }

  public setDocs(
    featureCollection: FeatureCollection,
    geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE
  ) {
    this._docArray = [];
    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i];
      const geometry = feature.geometry as
        | Point
        | MultiPoint
        | LineString
        | MultiLineString
        | Polygon
        | MultiPolygon;
      const coordinates =
        geoFieldType === ES_FIELD_TYPES.GEO_SHAPE
          ? {
              type: geometry.type.toLowerCase(),
              coordinates: geometry.coordinates,
            }
          : geometry.coordinates;
      const properties = feature.properties ? feature.properties : {};
      this._docArray.push({
        coordinates,
        ...properties,
      });
    }
  }
}
