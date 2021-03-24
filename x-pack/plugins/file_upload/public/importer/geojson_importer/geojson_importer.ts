/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Feature, Point } from 'geojson';
import { i18n } from '@kbn/i18n';
// @ts-expect-error
import { JSONLoader, loadInBatches } from './loaders';
import { CreateDocsResponse, ImportResults } from '../types';
import { callImportRoute, Importer, IMPORT_RETRIES, MAX_CHUNK_CHAR_COUNT } from '../importer';
import { ES_FIELD_TYPES } from '../../../../../../src/plugins/data/public';
// @ts-expect-error
import { geoJsonCleanAndValidate } from './geojson_clean_and_validate';
import { ImportDoc, ImportFailure, ImportResponse, MB } from '../../../common';

const BLOCK_SIZE_MB = 5 * MB;
export const GEOJSON_FILE_TYPES = ['.json', '.geojson'];

export interface GeoJsonPreview {
  features: Feature[];
  hasPoints: boolean;
  hasShapes: boolean;
  previewCoverage: number;
}

export class GeoJsonImporter extends Importer {
  private _file: File;
  private _isActive = true;
  private _iterator?: Iterator<unknown>;
  private _hasNext = true;
  private _features: Feature[] = [];
  private _totalBytesRead = 0;
  private _totalBytesImported = 0;
  private _blockSizeInBytes = 0;
  private _totalFeaturesRead = 0;
  private _totalFeaturesImported = 0;
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

  public async previewFile(rowLimit?: number, sizeLimit?: number): Promise<GeoJsonPreview> {
    await this._readUntil(rowLimit, sizeLimit);
    return {
      features: [...this._features],
      previewCoverage: this._hasNext
        ? Math.round((this._blockSizeInBytes / this._file.size) * 100)
        : 100,
      hasPoints: this._geometryTypesMap.has('Point') || this._geometryTypesMap.has('MultiPoint'),
      hasShapes:
        this._geometryTypesMap.has('LineString') ||
        this._geometryTypesMap.has('MultiLineString') ||
        this._geometryTypesMap.has('Polygon') ||
        this._geometryTypesMap.has('MultiPolygon') ||
        this._geometryTypesMap.has('GeometryCollection'),
    };
  }

  public setGeoFieldType(geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE) {
    this._geoFieldType = geoFieldType;
  }

  public async import(
    id: string,
    index: string,
    pipelineId: string | undefined,
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
    let importBlockPromise: Promise<ImportResults> | undefined;

    // Read file in blocks to avoid loading too much of file into memory at a time
    while ((this._features.length > 0 || this._hasNext) && this._isActive) {
      await this._readUntil(undefined, BLOCK_SIZE_MB);
      if (!this._isActive) {
        return {
          success: false,
          failures,
        };
      }

      // wait for previous import call to finish before starting next import
      if (importBlockPromise !== undefined) {
        const importBlockResults = await importBlockPromise;
        importBlockPromise = undefined;
        if (importBlockResults.failures) {
          failures.push(...importBlockResults.failures);
        }

        if (!importBlockResults.success) {
          success = false;
          error = importBlockResults.error;
          break;
        }
      }

      // Import block in chunks to avoid sending too much data to Elasticsearch at a time.
      const chunks = createChunks(this._features, this._geoFieldType, MAX_CHUNK_CHAR_COUNT);
      const blockSizeInBytes = this._blockSizeInBytes;

      // reset block for next read
      this._features = [];
      this._blockSizeInBytes = 0;

      importBlockPromise = this._importBlock(
        id,
        index,
        pipelineId,
        chunks,
        blockSizeInBytes,
        setImportProgress
      );
    }

    // wait for last import call
    if (importBlockPromise) {
      const importBlockResults = await importBlockPromise;
      if (importBlockResults.failures) {
        failures.push(...importBlockResults.failures);
      }

      if (!importBlockResults.success) {
        success = false;
        error = importBlockResults.error;
      }
    }

    setImportProgress(100);

    return {
      success,
      failures,
      docCount: this._totalFeaturesRead,
      error,
    };
  }

  private async _importBlock(
    id: string,
    index: string,
    pipelineId: string | undefined,
    chunks: ImportDoc[][],
    blockSizeInBytes: number,
    setImportProgress: (progress: number) => void
  ): Promise<ImportResults> {
    let success = true;
    const failures: ImportFailure[] = [];
    let error;

    for (let i = 0; i < chunks.length; i++) {
      let retries = IMPORT_RETRIES;
      let resp: ImportResponse = {
        success: false,
        failures: [],
        docCount: 0,
        id: '',
        index: '',
        pipelineId: '',
      };
      while (resp.success === false && retries > 0) {
        try {
          resp = await callImportRoute({
            id,
            index,
            data: chunks[i],
            settings: {},
            mappings: {},
            ingestPipeline: {
              id: pipelineId,
            },
          });

          if (!this._isActive) {
            return {
              success: false,
              failures,
            };
          }

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

      if (resp.failures && resp.failures.length) {
        // failure.item is the document position in the chunk passed to import endpoint.
        // Need to update failure.item to reflect the actual feature position in the file.
        // e.g. item 3 in chunk is actually item 20003
        for (let f = 0; f < resp.failures.length; f++) {
          const failure = resp.failures[f];
          failure.item += this._totalFeaturesImported;
        }
        failures.push(...resp.failures);
      }

      if (resp.success) {
        this._totalFeaturesImported += chunks[i].length;

        // Advance block percentage in equal increments
        // even though chunks are not identical in size.
        // Reason being that chunk size does not exactly correlate to bytes read from file
        // because features are converted to elasticsearch documents which changes the size.
        const chunkProgress = (i + 1) / chunks.length;
        const totalBytesImported = this._totalBytesImported + blockSizeInBytes * chunkProgress;
        const progressPercent = (totalBytesImported / this._file.size) * 100;
        setImportProgress(Math.round(progressPercent * 10) / 10);
      } else {
        success = false;
        error = resp.error;
        break;
      }
    }

    this._totalBytesImported += blockSizeInBytes;

    return {
      success,
      failures,
      error,
    };
  }

  private async _readUntil(rowLimit?: number, sizeLimit?: number) {
    while (
      this._isActive &&
      this._hasNext &&
      (rowLimit === undefined || this._features.length < rowLimit) &&
      (sizeLimit === undefined || this._blockSizeInBytes < sizeLimit)
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
      const bytesRead = batch.bytesUsed - this._totalBytesRead;
      this._blockSizeInBytes += bytesRead;
      this._totalBytesRead = batch.bytesUsed;
    }

    const rawFeatures: unknown[] = this._prevBatchLastFeature ? [this._prevBatchLastFeature] : [];
    this._prevBatchLastFeature = undefined;
    const isLastBatch = batch.batchType === 'root-object-batch-complete';
    if (isLastBatch) {
      // Handle single feature geoJson
      if (this._totalFeaturesRead === 0) {
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

      this._totalFeaturesRead++;
      if (!rawFeature.geometry || !rawFeature.geometry.type) {
        this._invalidFeatures.push({
          item: this._totalFeaturesRead,
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

export function createChunks(
  features: Feature[],
  geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE,
  maxChunkCharCount: number
): ImportDoc[][] {
  const chunks: ImportDoc[][] = [];

  let chunk: ImportDoc[] = [];
  let chunkChars = 0;
  for (let i = 0; i < features.length; i++) {
    const doc = toEsDoc(features[i], geoFieldType);
    const docChars = JSON.stringify(doc).length + 1; // +1 adds CHAR for comma once document is in list
    if (chunk.length === 0 || chunkChars + docChars < maxChunkCharCount) {
      // add ES document to current chunk
      chunk.push(doc);
      chunkChars += docChars;
    } else {
      // chunk boundary found, start new chunk
      chunks.push(chunk);
      chunk = [doc];
      chunkChars = docChars;
    }
  }

  if (chunk.length) {
    chunks.push(chunk);
  }

  return chunks;
}

export function toEsDoc(
  feature: Feature,
  geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE
) {
  const properties = feature.properties ? feature.properties : {};
  return {
    coordinates:
      geoFieldType === ES_FIELD_TYPES.GEO_SHAPE
        ? feature.geometry
        : (feature.geometry as Point).coordinates,
    ...properties,
  };
}
