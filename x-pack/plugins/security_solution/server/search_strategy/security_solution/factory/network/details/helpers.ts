/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import { GeoEcs } from '../../../../../../common/ecs/geo';
import { HostEcs } from '../../../../../../common/ecs/host';
import {
  AutonomousSystem,
  NetworkDetailsHostHit,
  NetworkHit,
} from '../../../../../../common/search_strategy/security_solution/network';
import { toObjectArrayOfStrings } from '../../../../../../common/utils/to_array';

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

const formatHostEcs = (data: Record<string, unknown> | null): HostEcs | null => {
  if (data == null) {
    return null;
  }
  return Object.entries(data).reduce<HostEcs>((acc, [key, value]) => {
    if (typeof value === 'object' && value != null && !Array.isArray(value)) {
      return { ...acc, [key]: formatHostEcs(value as Record<string, unknown>) };
    }
    return {
      ...acc,
      [key]: toObjectArrayOfStrings(value).map(({ str }) => str),
    };
  }, {});
};

export const getNetworkDetailsHostAgg = (hostDetailsHit: NetworkDetailsHostHit | {}) => {
  const hostFields: HostEcs | null = formatHostEcs(
    getOr(null, `results.hits.hits[0]._source.host`, hostDetailsHit)
  );
  return {
    host: {
      ...hostFields,
    },
  };
};
