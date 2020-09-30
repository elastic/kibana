/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import { GeoEcs } from '../../../../../../common/ecs/geo';
import { HostEcs } from '../../../../../../common/ecs/host';
import {
  AutonomousSystem,
  NetworkDetailsHostHit,
  NetworkHit,
} from '../../../../../../common/search_strategy/security_solution/network';

export const getNetworkDetailsAgg = (type: string, networkHit: NetworkHit | {}) => {
  const firstSeen = getOr(null, `firstSeen.value_as_string`, networkHit);
  const lastSeen = getOr(null, `lastSeen.value_as_string`, networkHit);
  const autonomousSystem: AutonomousSystem | null = getOr(
    null,
    `as.results.hits.hits[0]._source.${type}.as`,
    networkHit
  );
  const geoFields: GeoEcs | null = getOr(
    null,
    `geo.results.hits.hits[0]._source.${type}.geo`,
    networkHit
  );

  return {
    [type]: {
      firstSeen,
      lastSeen,
      autonomousSystem: {
        ...autonomousSystem,
      },
      geo: {
        ...geoFields,
      },
    },
  };
};

export const getNetworkDetailsHostAgg = (hostDetailsHit: NetworkDetailsHostHit | {}) => {
  const hostFields: HostEcs | null = getOr(
    null,
    `results.hits.hits[0]._source.host`,
    hostDetailsHit
  );
  return {
    host: {
      ...hostFields,
    },
  };
};
