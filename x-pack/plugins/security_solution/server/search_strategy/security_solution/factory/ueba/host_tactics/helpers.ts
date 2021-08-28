/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import {
  HostTacticsHit,
  HostTacticsEdges,
  HostTacticsFields,
  HostTechniqueHit,
} from '../../../../../../common';

export const formatHostTacticsData = (buckets: HostTacticsHit[]): HostTacticsEdges[] =>
  buckets.reduce((acc: HostTacticsEdges[], bucket) => {
    return [
      ...acc,
      ...getOr([], 'technique.buckets', bucket).map((t: HostTechniqueHit) => ({
        node: {
          _id: bucket.key + t.key,
          [HostTacticsFields.hits]: t.doc_count,
          [HostTacticsFields.riskScore]: getOr(0, 'risk_score.value', t),
          [HostTacticsFields.tactic]: bucket.key,
          [HostTacticsFields.technique]: t.key,
        },
        cursor: {
          value: bucket.key + t.key,
          tiebreaker: null,
        },
      })),
    ];
  }, []);
// buckets.map((bucket) => ({
//   node: {
//     _id: bucket.key,
//     [HostTacticsFields.hits]: bucket.doc_count,
//     [HostTacticsFields.riskScore]: getOr(0, 'risk_score.value', bucket),
//     [HostTacticsFields.tactic]: bucket.key,
//     [HostTacticsFields.technique]: getOr(0, 'technique.buckets[0].key', bucket),
//   },
//   cursor: {
//     value: bucket.key,
//     tiebreaker: null,
//   },
// }));
