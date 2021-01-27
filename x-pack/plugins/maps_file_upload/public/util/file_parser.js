/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { geoJsonCleanAndValidate } from './geo_json_clean_and_validate';
import { i18n } from '@kbn/i18n';
import { JSONLoader } from '@loaders.gl/json';
import { loadInBatches } from '@loaders.gl/core';

export const fileHandler = async ({
  file,
  setFileProgress,
  cleanAndValidate,
  getFileParseActive,
}) => {
  const filePromise = new Promise(async (resolve, reject) => {
    if (!file) {
      reject(
        new Error(
          i18n.translate('xpack.fileUpload.fileParser.noFileProvided', {
            defaultMessage: 'Error, no file provided',
          })
        )
      );
      return;
    }

    const batches = await loadInBatches(file, JSONLoader, {
      json: {
        jsonpaths: ['$.features'],
        _rootObjectBatches: true,
      },
    });

    let featuresProcessed = 0;
    const features = [];
    const errors = [];
    let boolGeometryErrs = false;
    let parsedGeojson;
    for await (const batch of batches) {
      if (getFileParseActive()) {
        switch (batch.batchType) {
          case 'root-object-batch-complete':
            if (!getFileParseActive()) {
              resolve(null);
              return;
            }
            if (featuresProcessed) {
              parsedGeojson = { ...batch.container, features };
            } else {
              // Handle single feature geoJson
              const cleanedSingleFeature = cleanAndValidate(batch.container);
              if (cleanedSingleFeature.geometry && cleanedSingleFeature.geometry.type) {
                parsedGeojson = cleanedSingleFeature;
                featuresProcessed++;
              }
            }
            break;
          default:
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
                const cleanFeature = cleanAndValidate(feature);
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
      } else {
        break;
      }
    }

    if (!featuresProcessed && getFileParseActive()) {
      reject(
        new Error(
          i18n.translate('xpack.fileUpload.fileParser.noFeaturesDetected', {
            defaultMessage: 'Error, no features detected',
          })
        )
      );
    } else if (!getFileParseActive()) {
      resolve(null);
    } else {
      resolve({
        errors,
        parsedGeojson,
      });
    }
  });

  return filePromise;
};

export function jsonPreview(fileResults, previewFunction) {
  if (fileResults && fileResults.parsedGeojson && previewFunction) {
    const defaultName = _.get(fileResults.parsedGeojson, 'name', 'Import File');
    previewFunction(fileResults.parsedGeojson, defaultName);
  }
}

export async function parseFile({
  file,
  transformDetails,
  onFileUpload: previewCallback = null,
  setFileProgress,
  getFileParseActive,
}) {
  let cleanAndValidate;
  if (typeof transformDetails === 'object') {
    cleanAndValidate = transformDetails.cleanAndValidate;
  } else {
    switch (transformDetails) {
      case 'geo':
        cleanAndValidate = geoJsonCleanAndValidate;
        break;
      default:
        throw i18n.translate('xpack.fileUpload.fileParser.transformDetailsNotDefined', {
          defaultMessage: 'Index options for {transformDetails} not defined',
          values: { transformDetails },
        });
    }
  }

  const fileResults = await fileHandler({
    file,
    setFileProgress,
    cleanAndValidate,
    getFileParseActive,
  });
  jsonPreview(fileResults, previewCallback);
  return fileResults;
}
