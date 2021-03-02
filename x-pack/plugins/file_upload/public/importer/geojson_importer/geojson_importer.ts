/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export class GeoJsonImporter extends Importer {
  constructor() {
    super();
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

  public async readFile(
    file: File,
    setFileProgress: ({
      featuresProcessed,
      bytesProcessed,
      totalBytes,
    }: {
      featuresProcessed: number;
      bytesProcessed: number;
      totalBytes: number;
    }) => void,
    isFileParseActive: () => boolean
  ): Promise<{
    errors: string[];
    geometryTypes: string[];
    parsedGeojson: FeatureCollection;
  } | null> {
    if (!file) {
      throw new Error(
        i18n.translate('xpack.fileUpload.fileParser.noFileProvided', {
          defaultMessage: 'Error, no file provided',
        })
      );
    }

    return new Promise(async (resolve, reject) => {
      const batches = await loadInBatches(file, JSONLoader, {
        json: {
          jsonpaths: ['$.features'],
          _rootObjectBatches: true,
        },
      });

      const rawFeatures: unknown[] = [];
      for await (const batch of batches) {
        if (!isFileParseActive()) {
          break;
        }

        if (batch.batchType === 'root-object-batch-complete') {
          // Handle single feature geoJson
          if (rawFeatures.length === 0) {
            rawFeatures.push(batch.container);
          }
        } else {
          rawFeatures.push(...batch.data);
        }

        setFileProgress({
          featuresProcessed: rawFeatures.length,
          bytesProcessed: batch.bytesUsed,
          totalBytes: file.size,
        });
      }

      if (!isFileParseActive()) {
        resolve(null);
        return;
      }

      if (rawFeatures.length === 0) {
        reject(
          new Error(
            i18n.translate('xpack.fileUpload.fileParser.noFeaturesDetected', {
              defaultMessage: 'Error, no features detected',
            })
          )
        );
        return;
      }

      const features: Feature[] = [];
      const geometryTypesMap = new Map<string, boolean>();
      let invalidCount = 0;
      for (let i = 0; i < rawFeatures.length; i++) {
        const rawFeature = rawFeatures[i] as Feature;
        if (!rawFeature.geometry || !rawFeature.geometry.type) {
          invalidCount++;
        } else {
          if (!geometryTypesMap.has(rawFeature.geometry.type)) {
            geometryTypesMap.set(rawFeature.geometry.type, true);
          }
          features.push(geoJsonCleanAndValidate(rawFeature));
        }
      }

      const errors: string[] = [];
      if (invalidCount > 0) {
        errors.push(
          i18n.translate('xpack.fileUpload.fileParser.featuresOmitted', {
            defaultMessage: '{invalidCount} features without geometry omitted',
            values: { invalidCount },
          })
        );
      }
      resolve({
        errors,
        geometryTypes: Array.from(geometryTypesMap.keys()),
        parsedGeojson: {
          type: 'FeatureCollection',
          features,
        },
      });
    });
  }
}
