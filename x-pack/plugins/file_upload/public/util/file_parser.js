/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export async function parseFile(file, postProcessing, FileReader = window.FileReader) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = ({ target: { result } }) => {
      try {
        let parsedJson = JSON.parse(result);
        if (postProcessing) {
          parsedJson = postProcessing(parsedJson);
        }
        resolve(parsedJson);
      } catch (e) {
        reject(e);
      }
    };
    fr.readAsText(file);
  });
}
