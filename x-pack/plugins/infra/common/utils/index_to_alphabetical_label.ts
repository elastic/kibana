/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const idxToAlphabeticalLabel = (idx: number) => {
  const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const labelRepeatLength = Math.floor(idx / 26);
  return Array.from(Array(labelRepeatLength + 1), () => labels[idx % 26]).join('');
};
