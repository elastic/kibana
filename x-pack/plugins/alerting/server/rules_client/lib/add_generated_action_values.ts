/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { buildEsQuery, Filter } from '@kbn/es-query';
import Boom from '@hapi/boom';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import {
  NormalizedAlertAction,
  NormalizedAlertDefaultActionWithGeneratedValues,
  NormalizedAlertSystemActionWithGeneratedValues,
  NormalizedSystemAction,
  RulesClientContext,
} from '..';

export async function addGeneratedActionValues(
  actions: NormalizedAlertAction[] = [],
  systemActions: NormalizedSystemAction[] = [],
  context: RulesClientContext
): Promise<{
  actions: NormalizedAlertDefaultActionWithGeneratedValues[];
  systemActions: NormalizedAlertSystemActionWithGeneratedValues[];
}> {
  const uiSettingClient = context.uiSettings.asScopedToClient(context.unsecuredSavedObjectsClient);
  const [allowLeadingWildcards, queryStringOptions, ignoreFilterIfFieldNotInIndex] =
    await Promise.all([
      uiSettingClient.get(UI_SETTINGS.QUERY_ALLOW_LEADING_WILDCARDS),
      uiSettingClient.get(UI_SETTINGS.QUERY_STRING_OPTIONS),
      uiSettingClient.get(UI_SETTINGS.COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX),
    ]);
  const esQueryConfig = {
    allowLeadingWildcards,
    queryStringOptions,
    ignoreFilterIfFieldNotInIndex,
  };
  const generateDSL = (kql: string, filters: Filter[]): string => {
    try {
      return JSON.stringify(
        buildEsQuery(undefined, [{ query: kql, language: 'kuery' }], filters, esQueryConfig)
      );
    } catch (e) {
      throw Boom.badRequest(`Error creating DSL query: invalid KQL`);
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
