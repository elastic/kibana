/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import { SLODefinition } from '../../../domain/models/slo';

export const getGroupBy = (slo: SLODefinition) => {
  const groups = [slo.groupBy].flat().filter((group) => !!group);

  const groupings =
    !groups.includes(ALL_VALUE) && groups.length
      ? groups.reduce((acc, field) => {
          return {
            ...acc,
            [`slo.groupings.${field}`]: {
              terms: {
                field: `slo.groupings.${field}`,
              },
            },
          };
        }, {})
      : {};

  return {
    'slo.id': {
      terms: {
        field: 'slo.id',
      },
    },
    'slo.revision': {
      terms: {
        field: 'slo.revision',
      },
    },
    'slo.instanceId': {
      terms: {
        field: 'slo.instanceId',
      },
    },
    ...groupings,
    // optional fields: only specified for APM indicators. Must include missing_bucket:true
    'service.name': {
      terms: {
        field: 'service.name',
        missing_bucket: true,
      },
    },
    'service.environment': {
      terms: {
        field: 'service.environment',
        missing_bucket: true,
      },
    },
    'transaction.name': {
      terms: {
        field: 'transaction.name',
        missing_bucket: true,
      },
    },
    'transaction.type': {
      terms: {
        field: 'transaction.type',
        missing_bucket: true,
      },
    },
  };
};
