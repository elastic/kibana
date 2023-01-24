/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { threatIndicatorNamesOriginScript, threatIndicatorNamesScript } from './indicator_name';

export const getRuntimeMappings = () =>
  ({
    'threat.indicator.name': {
      type: 'keyword',
      script: {
        source: threatIndicatorNamesScript(),
      },
    },
    'threat.indicator.name_origin': {
      type: 'keyword',
      script: {
        source: threatIndicatorNamesOriginScript(),
      },
    },
  } as const);
