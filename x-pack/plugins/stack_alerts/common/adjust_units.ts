/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const adjustUnit = (unit: string) => {
  if (unit === 'h') {
    return 'h/h';
  } else if (unit === 'd') {
    return 'd/d';
  } else if (unit === 'y') {
    return 'y/d';
  }

  return unit;
};
