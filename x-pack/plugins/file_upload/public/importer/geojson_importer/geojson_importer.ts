/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Feature,
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
import { CreateDocsResponse, ImportResults } from '../types';
import { callImportRoute, Importer, IMPORT_RETRIES } from '../importer';
import { ES_FIELD_TYPES } from '../../../../../../src/plugins/data/public';
// @ts-expect-error
import { geoJsonCleanAndValidate } from './geojson_clean_and_validate';
import { ImportFailure, ImportResponse, MB } from '../../../common';

const IMPORT_CHUNK_SIZE_MB = 10 * MB;
export const GEOJSON_FILE_TYPES = ['.json', '.geojson'];

export class GeoJsonImporter extends Importer {
  private _file: File;
  private _isActive = true;
  private _iterator?: Iterator<unknown>;
  private _hasNext = true;
  private _features: Feature[] = [];
  private _totalBytesProcessed = 0;
  private _unimportedBytesProcessed = 0;
  private _totalFeatures = 0;
  private _geometryTypesMap = new Map<string, boolean>();
  private _invalidFeatures: ImportFailure[] = [];
  private _prevBatchLastFeature?: Feature;
  private _geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE =
    ES_FIELD_TYPES.GEO_SHAPE;

  constructor(file: File) {
    super();

    this._file = file;
  }

  public destroy() {
    this._isActive = false;
  }

  public async previewFile(
    rowLimit?: number,
    sizeLimit?: number
  ): Promise<{ features: Feature[]; geoFieldTypes: string[]; previewCoverage: number }> {
    await this._readUntil(rowLimit, sizeLimit);
    return {
      features: [...this._features],
      previewCoverage: this._hasNext
        ? Math.round((this._unimportedBytesProcessed / this._file.size) * 100)
        : 100,
      geoFieldTypes:
        this._geometryTypesMap.has('Point') || this._geometryTypesMap.has('MultiPoint')
          ? [ES_FIELD_TYPES.GEO_POINT, ES_FIELD_TYPES.GEO_SHAPE]
          : [ES_FIELD_TYPES.GEO_SHAPE],
    };
  }

  public setGeoFieldType(geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE) {
    this._geoFieldType = geoFieldType;
  }

  public async import(
    id: string,
    index: string,
    pipelineId: string,
    setImportProgress: (progress: number) => void
  ): Promise<ImportResults> {
    if (!id || !index) {
      return {
        success: false,
        error: i18n.translate('xpack.fileUpload.import.noIdOrIndexSuppliedErrorMessage', {
          defaultMessage: 'no ID or index supplied',
        }),
      };
    }

    let success = true;
    const failures: ImportFailure[] = [...this._invalidFeatures];
    let error;

    while (this._features.length > 0 || (this._hasNext && this._isActive)) {
      await this._readUntil(undefined, IMPORT_CHUNK_SIZE_MB);
      if (!this._isActive) {
        return {
          success: false,
          failures,
          docCount: this._totalFeatures,
        };
      }

      let retries = IMPORT_RETRIES;
      let resp: ImportResponse = {
        success: false,
        failures: [],
        docCount: 0,
        id: '',
        index: '',
        pipelineId: '',
      };
      const data = toEsDocs(this._features, this._geoFieldType);
      const progress = Math.round((this._totalBytesProcessed / this._file.size) * 100);
      this._features = [];
      this._unimportedBytesProcessed = 0;

      while (resp.success === false && retries > 0) {
        try {
          resp = await callImportRoute({
            id,
            index,
            data,
            settings: {},
            mappings: {},
            ingestPipeline: {
              id: pipelineId,
            },
          });

          if (retries < IMPORT_RETRIES) {
            // eslint-disable-next-line no-console
            console.log(`Retrying import ${IMPORT_RETRIES - retries}`);
          }

          retries--;
        } catch (err) {
          resp.success = false;
          resp.error = err;
          retries = 0;
        }
      }

      failures.push(...resp.failures);

      if (!resp.success) {
        success = false;
        error = resp.error;
        break;
      }

      setImportProgress(progress);
    }

    const result: ImportResults = {
      success,
      failures,
      docCount: this._totalFeatures,
    };

    if (success) {
      setImportProgress(100);
    } else {
      result.error = error;
    }

    return result;
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

    if (!this._isActive || !this._iterator) {
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
        this._invalidFeatures.push({
          item: this._totalFeatures,
          reason: i18n.translate('xpack.fileUpload.geojsonImporter.noGeometry', {
            defaultMessage: 'Feature does not contain required field "geometry"',
          }),
          doc: rawFeature,
        });
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
}

export function toEsDocs(
  features: Feature[],
  geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE
) {
  const esDocs = [];
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
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
    esDocs.push({
      coordinates,
      ...properties,
    });
  }
  return esDocs;
}
