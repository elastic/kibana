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
        parsedJson = geoJsonToEs(parsedJson);
        resolve(parsedJson);
      } catch (e) {
        console.log(e);
        reject(e);
      }
    };
    fr.readAsText(file);
  });
}

function geoJsonToEs(parsedGeojson) {
  if (!parsedGeojson) {
    return [];
  }
  const shapes = parsedGeojson.type === 'Feature'
    ? [ parsedGeojson ]
    : parsedGeojson.features;

  return shapes.reduce((accu, shape) => {
    accu.push(JSON.stringify({
      location: {
        'type': shape.geometry.type.toLowerCase(),
        'coordinates': shape.geometry.coordinates
      },
      name: _.get(shape, 'properties.name', '')
    }));
    return accu;
  }, []);
}
