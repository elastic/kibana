/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { geoJsonCleanAndValidate } from './geo_json_clean_and_validate';

export async function parseFile(file, previewCallback = null, preIndexTransform,
  FileReader = window.FileReader) {

  let cleanAndValidate;
  if (typeof preIndexTransform === 'object') {
    cleanAndValidate = preIndexTransform.cleanAndValidate;
  } else {
    switch(preIndexTransform) {
      case 'geo':
        cleanAndValidate = geoJsonCleanAndValidate;
        break;
      default:
        throw(`Index options for ${preIndexTransform} not defined`);
        return;
    }
  }

  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = ({ target: { result } }) => {
      try {
        const parsedJson = JSON.parse(result);
        // Clean & validate
        const cleanAndValidJson = cleanAndValidate(parsedJson);
        if (!cleanAndValidJson) {
          return;
        }
        if (previewCallback) {
          const defaultName = _.get(cleanAndValidJson, 'name', 'fileToImport');
          previewCallback(cleanAndValidJson, defaultName);
        }
        resolve(cleanAndValidJson);
      } catch (e) {
        console.log(e);
        reject(e);
      }
    };
    fr.readAsText(file);
  });
}
