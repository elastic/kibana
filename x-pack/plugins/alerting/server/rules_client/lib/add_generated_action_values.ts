/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { buildEsQuery, Filter } from '@kbn/es-query';
import Boom from '@hapi/boom';
import {
  NormalizedAlertAction,
  NormalizedAlertDefaultActionWithGeneratedValues,
  NormalizedAlertSystemActionWithGeneratedValues,
  NormalizedSystemAction,
  RulesClientContext,
} from '..';
import { getEsQueryConfig } from '../../lib/get_es_query_config';

export async function addGeneratedActionValues(
  actions: NormalizedAlertAction[] = [],
  systemActions: NormalizedSystemAction[] = [],
  context: RulesClientContext
): Promise<{
  actions: NormalizedAlertDefaultActionWithGeneratedValues[];
  systemActions: NormalizedAlertSystemActionWithGeneratedValues[];
}> {
  const uiSettingClient = context.uiSettings.asScopedToClient(context.unsecuredSavedObjectsClient);
  const esQueryConfig = await getEsQueryConfig(uiSettingClient);

  const generateDSL = (kql: string, filters: Filter[]): string => {
    try {
      return JSON.stringify(
        buildEsQuery(undefined, [{ query: kql, language: 'kuery' }], filters, esQueryConfig)
      );
    } catch (e) {
      throw Boom.badRequest(`Invalid KQL: ${e.message}`);
    }
  };

  return {
    actions: actions.map((action) => {
      const { alertsFilter, uuid, ...restAction } = action;
      return {
        ...restAction,
        uuid: uuid || v4(),
        ...(alertsFilter
          ? {
              alertsFilter: {
                ...alertsFilter,
                query: alertsFilter.query
                  ? {
                      ...alertsFilter.query,
                      dsl: generateDSL(alertsFilter.query.kql, alertsFilter.query.filters) ?? '',
                    }
                  : undefined,
              },
            }
          : {}),
      };
    }),
    systemActions: systemActions.map((systemAction) => ({
      ...systemAction,
      uuid: systemAction.uuid || v4(),
    })),
  };
}
