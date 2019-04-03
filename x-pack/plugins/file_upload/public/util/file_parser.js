/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

export async function parseFile(file, previewCallback = null, postProcessing = null, FileReader = window.FileReader) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = ({ target: { result } }) => {
      try {
        let parsedJson = JSON.parse(result);
        if (previewCallback) {
          const defaultName = _.get(parsedJson, 'name', 'fileToImport');
          previewCallback(parsedJson, defaultName);
        }
        if (postProcessing) {
          parsedJson = postProcessing(parsedJson);
        }
        parsedJson = transformJson(parsedJson);
        resolve(parsedJson);
      } catch (e) {
        console.log(e);
        reject(e);
      }
    };
    fr.readAsText(file);
  });
}

function transformJson(parsedJson) {
  return parsedJson.reduce((accu, el) => {
    accu.push(JSON.stringify({ 'name': el.name, 'location': [el.latlng[1], el.latlng[0]] }));
    return accu;
  }, []);
}
