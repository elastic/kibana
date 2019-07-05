/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


const ZOOM_TO_PRECISION = {
  "0": 1,
  "1": 2,
  "2": 2,
  "3": 2,
  "4": 3,
  "5": 3,
  "6": 4,
  "7": 4,
  "8": 4,
  "9": 5,
  "10": 5,
  "11": 6,
  "12": 6,
  "13": 6,
  "14": 7,
  "15": 7,
  "16": 8,
  "17": 8,
  "18": 8,
  "19": 9,
  "20": 9,
  "21": 10,
  "22": 10,
  "23": 10,
  "24": 11,
  "25": 11,
  "26": 12,
  "27": 12,
  "28": 12,
  "29": 12,
  "30": 12
};

export const getGeohashPrecisionForZoom = (zoom) => {
  let zoomNormalized = Math.round(zoom);
  zoomNormalized = Math.max(0, Math.min(zoomNormalized, 30));
  return ZOOM_TO_PRECISION[zoomNormalized];
};
