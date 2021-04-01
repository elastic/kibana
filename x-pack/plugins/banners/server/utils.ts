/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const hexColorRegexp = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;

export const isHexColor = (color: string) => {
  return hexColorRegexp.test(color);
};
