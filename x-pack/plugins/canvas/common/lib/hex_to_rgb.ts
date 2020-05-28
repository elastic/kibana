/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const hexToRgb = (hex: string) => {
  const shorthandHexColor = /^#?([a-f\d]{1})([a-f\d]{1})([a-f\d]{1})$/i;
  const hexColor = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

  const shorthandMatches = shorthandHexColor.exec(hex);
  if (shorthandMatches) {
    return shorthandMatches.slice(1, 4).map((mappedHex) => parseInt(mappedHex + mappedHex, 16));
  }

  const hexMatches = hexColor.exec(hex);
  if (hexMatches) {
    return hexMatches.slice(1, 4).map((slicedHex) => parseInt(slicedHex, 16));
  }

  return null;
};
