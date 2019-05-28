/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import maki from '@mapbox/maki';

function cleanSymbolId(symbolId) {
  return symbolId.replace('-', '');
}

const symbols = {};
maki.svgArray.forEach(svgString => {
  const ID_FRAG = 'id="';
  const index = svgString.indexOf(ID_FRAG);
  if (index !== -1) {
    const idStartIndex = index + ID_FRAG.length;
    const idEndIndex = svgString.substring(idStartIndex).indexOf('"') + idStartIndex;
    const symbolId = svgString.substring(idStartIndex, idEndIndex);
    symbols[cleanSymbolId(symbolId)] = svgString;
  }
});

export function loadMakiSvg(symbolId) {
  const cleanId = cleanSymbolId(symbolId);
  if (!symbols[cleanId]) {
    throw new Error(`Unable to find maki symbol for id: ${symbolId}`);
  }
  return symbols[cleanId];
}
