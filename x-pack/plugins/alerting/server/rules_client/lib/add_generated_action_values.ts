/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { buildEsQuery, Filter } from '@kbn/es-query';
import Boom from '@hapi/boom';
import { NormalizedAlertAction, NormalizedAlertActionWithGeneratedValues } from '..';

export function addGeneratedActionValues(
  actions: NormalizedAlertAction[] = []
): NormalizedAlertActionWithGeneratedValues[] {
  return actions.map(({ uuid, alertsFilter, ...action }) => {
    const generateDSL = (kql: string, filters: Filter[]) => {
      try {
        return JSON.stringify(buildEsQuery(undefined, [{ query: kql, language: 'kql' }], filters));
      } catch (e) {
        throw Boom.badRequest(`Error creating DSL query: invalid KQL`);
      }
    };

    return {
      ...action,
      uuid: uuid || v4(),
      ...(alertsFilter
        ? {
            alertsFilter: {
              ...alertsFilter,
              timeframe: alertsFilter.timeframe || null,
              query: !alertsFilter.query
                ? null
                : {
                    kql: alertsFilter.query.kql,
                    filters: alertsFilter.query.filters,
                    dsl: generateDSL(alertsFilter.query.kql, alertsFilter.query.filters),
                  },
            },
          }
        : {}),
    };
  });
}
