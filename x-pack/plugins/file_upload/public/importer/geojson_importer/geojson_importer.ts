/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Feature, FeatureCollection } from 'geojson';
import { i18n } from '@kbn/i18n';
// @ts-expect-error
import { JSONLoader } from '@loaders.gl/json';
import { loadInBatches } from '@loaders.gl/core';
import { CreateDocsResponse } from '../types';
import { Importer } from '../importer';
// @ts-expect-error
import { geoJsonCleanAndValidate } from './geo_json_clean_and_validate';

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
  ): Promise<{ errors: string[]; parsedGeojson: FeatureCollection } | null> {
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
      let invalidCount = 0;
      for (let i = 0; i < rawFeatures.length; i++) {
        const rawFeature = rawFeatures[i] as Feature;
        if (!rawFeature.geometry || !rawFeature.geometry.type) {
          invalidCount++;
        } else {
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
        parsedGeojson: {
          type: 'FeatureCollection',
          features,
        },
      });
    });
  }
}
