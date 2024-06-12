/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { buildEsQuery, Filter } from '@kbn/es-query';
import Boom from '@hapi/boom';
import { ALERT_SEVERITY_IMPROVING } from '@kbn/rule-data-utils';
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

  const generateDSL = ({
    kql,
    filters = [],
    addPrebuiltSeverityImprovingFilter,
  }: {
    kql?: string;
    filters?: Filter[];
    addPrebuiltSeverityImprovingFilter?: boolean;
  }): string => {
    try {
      let kqlToUse: string = '';
      if (kql && addPrebuiltSeverityImprovingFilter != null) {
        kqlToUse = `(${kql}) AND ${ALERT_SEVERITY_IMPROVING}: ${addPrebuiltSeverityImprovingFilter}`;
      } else if (kql) {
        kqlToUse = kql;
      } else if (addPrebuiltSeverityImprovingFilter != null) {
        kqlToUse = `${ALERT_SEVERITY_IMPROVING}: ${addPrebuiltSeverityImprovingFilter}`;
      } else {
        return '';
      }
      return JSON.stringify(
        buildEsQuery(undefined, [{ query: kqlToUse, language: 'kuery' }], filters, esQueryConfig)
      );
    } catch (e) {
      throw Boom.badRequest(`Invalid KQL: ${e.message}`);
    }
  };

  return {
    actions: actions.map((action) => {
      const { alertsFilter, uuid, ...restAction } = action;
      const dsl =
        generateDSL({
          kql: alertsFilter?.query?.kql,
          filters: alertsFilter?.query?.filters,
          addPrebuiltSeverityImprovingFilter: alertsFilter?.prebuiltQuery?.severityImproving,
        }) ?? '';
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
                      dsl,
                    }
                  : {
                      dsl,
                      kql: '',
                      filters: [],
                    },
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
