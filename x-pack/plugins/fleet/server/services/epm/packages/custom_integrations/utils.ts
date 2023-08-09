/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NAME_PREFIX } from './constants';

export const convertStringToTitle = (name: string) => {
  return name
    .split('_')
    .map((word) => {
      return word[0].toUpperCase() + word.substring(1);
    })
    .join(' ');
};

export const generateDescription = (datasetNames: string[]) =>
  `Collect logs for the datasets: ${datasetNames.join(', ')}`;

export const prefixPkgName = (pkgName: string) => `${NAME_PREFIX}${pkgName}`;
