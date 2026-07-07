/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getGeoData = ({ id, label }: { label?: string; id?: string } = {}) => ({
  observer: {
    geo: {
      name: label ?? 'Dev Service',
      location: '41.8780, 93.0977',
    },
    name: id ?? 'dev',
  },
});
