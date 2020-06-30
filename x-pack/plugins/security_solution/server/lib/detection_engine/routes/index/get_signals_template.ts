/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import signalsMapping from './signals_mapping.json';
import ecsMapping from './ecs_mapping.json';

export const getSignalsTemplate = (index: string) => {
  ecsMapping.mappings.properties.signal = signalsMapping.mappings.properties.signal;
  const template = {
    settings: {
      index: {
        lifecycle: {
          name: index,
          rollover_alias: index,
        },
      },
      mapping: {
        total_fields: {
          limit: 10000,
        },
      },
    },
    index_patterns: [`${index}-*`],
    mappings: ecsMapping.mappings,
  };
  return template;
};
