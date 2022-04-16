/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';
import { Feature } from 'geojson';
import { i18n } from '@kbn/i18n';
import { ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import { GeoFileImporter, GeoFilePreview } from './types';
import { CreateDocsResponse, ImportResults } from '../types';
import { callImportRoute, Importer, IMPORT_RETRIES, MAX_CHUNK_CHAR_COUNT } from '../importer';
import { MB } from '../../../common/constants';
import type { ImportDoc, ImportFailure, ImportResponse } from '../../../common/types';
// @ts-expect-error
import { geoJsonCleanAndValidate } from './geojson_clean_and_validate';
import { createChunks } from './create_chunks';

const BLOCK_SIZE_MB = 5 * MB;

export class AbstractGeoFileImporter extends Importer implements GeoFileImporter {
  private _file: File;
  private _isActive = true;
  private _hasNext = true;
  private _features: Feature[] = [];
  private _totalBytesRead = 0;
  private _totalBytesImported = 0;
  private _blockSizeInBytes = 0;
  private _totalFeaturesRead = 0;
  private _totalFeaturesImported = 0;
  private _geometryTypesMap = new Map<string, boolean>();
  private _invalidFeatures: ImportFailure[] = [];
  private _geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE =
    ES_FIELD_TYPES.GEO_SHAPE;

  constructor(file: File) {
    super();

    this._file = file;
  }

  public destroy() {
    this._isActive = false;
  }

  public canPreview() {
    return true;
  }

  public renderEditor(onChange: () => void): ReactNode {
    return null;
  }

  public async previewFile(rowLimit?: number, sizeLimit?: number): Promise<GeoFilePreview> {
    await this._readUntil(rowLimit, sizeLimit);
    return {
      features: [...this._features],
      previewCoverage: this._hasNext
        ? Math.round(this._getProgress(this._features.length, this._blockSizeInBytes))
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
        const importPercent = this._getProgress(this._totalFeaturesImported, totalBytesImported);
        setImportProgress(Math.round(importPercent * 10) / 10);
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
      const results = await this._readNext(this._totalFeaturesRead, this._totalBytesRead);
      this._hasNext = results.hasNext;
      this._blockSizeInBytes = this._blockSizeInBytes + results.bytesRead;
      this._features = [
        ...this._features,
        ...results.features.map((feature) => {
          return geoJsonCleanAndValidate(feature);
        }),
      ];
      results.geometryTypesMap.forEach((value, key) => {
        this._geometryTypesMap.set(key, value);
      });
      this._invalidFeatures = [...this._invalidFeatures, ...results.invalidFeatures];
      this._totalBytesRead = this._totalBytesRead + results.bytesRead;
      this._totalFeaturesRead =
        this._totalFeaturesRead + results.features.length + results.invalidFeatures.length;
    }
  }

  protected _readNext(
    prevFeaturesRead: number,
    prevBytesRead: number
  ): Promise<{
    bytesRead: number;
    features: Feature[];
    geometryTypesMap: Map<string, boolean>;
    invalidFeatures: ImportFailure[];
    hasNext: boolean;
  }> {
    throw new Error('Should implement AbstractGeoFileImporter._next');
  }

  protected _getProgress(featuresProcessed: number, bytesProcessed: number) {
    return (bytesProcessed / this._file.size) * 100;
  }

  protected _getIsActive() {
    return this._isActive;
  }

  protected _getFile() {
    return this._file;
  }

  public read(data: ArrayBuffer): { success: boolean } {
    throw new Error('read(data: ArrayBuffer) not supported, use previewFile and import instead.');
  }

  protected _createDocs(text: string): CreateDocsResponse {
    throw new Error('_createDocs not implemented.');
  }
}
