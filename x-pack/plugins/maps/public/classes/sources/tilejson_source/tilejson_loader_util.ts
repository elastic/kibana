/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const tileJsonDocCache = new Map();

export async function loadTileJsonDocument(url: string): any {
  if (tileJsonDocCache.has(url)) {
    return tileJsonDocCache.get(url);
  }

  let document;
  try {
    document = await fetch(url);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    throw new Error(`Cannot load ${url}: ${e.message}`);
  }

  let docJson;
  try {
    docJson = await document.json();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    throw new Error(`Cannot parse contents as json: ${e.message}`);
  }

  tileJsonDocCache.set(url, docJson);
  return docJson;
}
