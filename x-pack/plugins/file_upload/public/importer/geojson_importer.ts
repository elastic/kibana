/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Feature } from 'geojson';
import { i18n } from '@kbn/i18n';
import { JSONLoader } from '@loaders.gl/json';
import { loadInBatches } from '@loaders.gl/core';
import { ImportFactoryOptions } from './types';
import { Importer } from './importer';
import { geoJsonCleanAndValidate } from '../util/geo_json_clean_and_validate';

export class GeoJsonImporter extends Importer {
  constructor() {
    super();
  }

  public read(data: ArrayBuffer) {
    throw new Error('read(data: ArrayBuffer) not supported, use readFile instead.');
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
  ) {
    if (!file) {
      throw new Error(
        i18n.translate('xpack.fileUpload.fileParser.noFileProvided', {
          defaultMessage: 'Error, no file provided',
        })
      );
    }

    const filePromise = new Promise(async (resolve, reject) => {
      const batches = await loadInBatches(file, JSONLoader, {
        json: {
          jsonpaths: ['$.features'],
          _rootObjectBatches: true,
        },
      });

      let featuresProcessed = 0;
      const features: Feature[] = [];
      const errors: string = [];
      let boolGeometryErrs = false;
      let parsedGeojson;
      for await (const batch of batches) {
        if (!isFileParseActive()) {
          break;
        }

        if (batch.batchType === 'root-object-batch-complete') {
          if (featuresProcessed > 0) {
            parsedGeojson = { ...batch.container, features };
          } else {
            // Handle single feature geoJson
            const cleanedSingleFeature = geoJsonCleanAndValidate(batch.container);
            if (cleanedSingleFeature.geometry && cleanedSingleFeature.geometry.type) {
              parsedGeojson = cleanedSingleFeature;
              featuresProcessed++;
            }
          }
        } else {
          for (const feature of batch.data) {
            if (!feature.geometry || !feature.geometry.type) {
              if (!boolGeometryErrs) {
                boolGeometryErrs = true;
                errors.push(
                  new Error(
                    i18n.translate('xpack.fileUpload.fileParser.featuresOmitted', {
                      defaultMessage: 'Some features without geometry omitted',
                    })
                  )
                );
              }
            } else {
              const cleanFeature = geoJsonCleanAndValidate(feature);
              features.push(cleanFeature);
              featuresProcessed++;
            }
          }
        }

        setFileProgress({
          featuresProcessed,
          bytesProcessed: batch.bytesUsed,
          totalBytes: file.size,
        });
      }

      if (!isFileParseActive()) {
        resolve(null);
        return;
      }

      if (featuresProcessed === 0) {
        reject(
          new Error(
            i18n.translate('xpack.fileUpload.fileParser.noFeaturesDetected', {
              defaultMessage: 'Error, no features detected',
            })
          )
        );
      } else {
        resolve({
          errors,
          parsedGeojson,
        });
      }
    });

    return filePromise;
  }
}
