/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const countiesFieldMappings = {
  'SMIS': {
    type: 'keyword'
  },
  'NAME': {
    type: 'keyword'
  },
  'FIPS_ID': {
    type: 'keyword'
  },
  'POP70': {
    type: 'integer'
  },
  'POP80': {
    type: 'integer'
  },
  'POP90': {
    type: 'integer'
  },
  'POP00': {
    type: 'integer'
  },
  'POP10': {
    type: 'integer'
  },
  'CH70_80': {
    type: 'scaled_float',
    scaling_factor: 10000
  },
  'CH80_90': {
    type: 'scaled_float',
    scaling_factor: 10000
  },
  'CH90_00': {
    type: 'scaled_float',
    scaling_factor: 1000
  },
  'CH00_10': {
    type: 'scaled_float',
    scaling_factor: 10000
  },
  'POP70SQ': {
    type: 'scaled_float',
    scaling_factor: 10000
  },
  'POP80SQ': {
    type: 'scaled_float',
    scaling_factor: 10000
  },
  'POP90SQ': {
    type: 'scaled_float',
    scaling_factor: 10000
  },
  'POP00SQ': {
    type: 'scaled_float',
    scaling_factor: 10000
  },
  'POP10SQ': {
    type: 'scaled_float',
    scaling_factor: 10000
  },
  'CHSQ70_80': {
    type: 'scaled_float',
    scaling_factor: 10000
  },
  'CHSQ80_90': {
    type: 'scaled_float',
    scaling_factor: 10000
  },
  'CHSQ90_00': {
    type: 'scaled_float',
    scaling_factor: 10000
  },
  'CHSQ00_10': {
    type: 'scaled_float',
    scaling_factor: 10000
  },
  'MILES_SQ': {
    type: 'scaled_float',
    scaling_factor: 100
  },
  'geometry': {
    'type': 'geo_shape'
  }
};
