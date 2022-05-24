/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set';
import { getOr } from 'lodash/fp';
import { GeoEcs } from '../../../../../../common/ecs/geo';
import {
  AutonomousSystem,
  NetworkHit,
} from '../../../../../../common/search_strategy/security_solution/network';

export const getNetworkDetailsAgg = (type: string, networkHit: NetworkHit | {}) => {
  const firstSeen = getOr(null, `firstSeen.value_as_string`, networkHit);
  const lastSeen = getOr(null, `lastSeen.value_as_string`, networkHit);

  const autonomousSystem: AutonomousSystem | null = getOr(
    null,
    `${type}.as`,
    unflattenObject(getOr({}, 'as.results.hits.hits[0].fields', networkHit))
  );

  const geoFields: GeoEcs | null = getOr(
    null,
    `${type}.geo`,
    unflattenObject(getOr({}, 'geo.results.hits.hits[0].fields', networkHit))
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

interface GenericObject {
  [key: string]: any;
}

export const unflattenObject = <T extends object = GenericObject>(object: object): T =>
  Object.entries(object).reduce((acc, [key, value]) => {
    set(acc, key, value);
    return acc;
  }, {} as T);
