/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const countiesFieldMappings = {
  'AFFGEOID': {
    type: 'keyword'
  },
  'ALAND': {
    'type': 'long'
  },
  'AWATER': {
    'type': 'long'
  },
  'COUNTYFP': {
    type: 'keyword'
  },
  'COUNTYNS': {
    type: 'keyword'
  },
  'GEOID': {
    type: 'keyword'
  },
  'LSAD': {
    type: 'keyword'
  },
  'NAME': {
    type: 'keyword'
  },
  'STATEFP': {
    type: 'keyword'
  },
  'geometry': {
    'type': 'geo_shape'
  }
};
