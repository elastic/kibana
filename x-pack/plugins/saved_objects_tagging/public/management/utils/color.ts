/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getRandomColor = (): string => {
  return '#' + String(Math.floor(Math.random() * 16777215).toString(16)).padStart(6, '0');
};
