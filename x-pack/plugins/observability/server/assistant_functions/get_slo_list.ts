/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse, indicators } from '@kbn/slo-schema';
import { ALERT_RULE_PRODUCER, ALERT_STATUS, ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import { FunctionRegistrationParameters } from '.';
import { kqlQuery } from '..';
import { getSLOAlertsClient } from '../lib/rules/slo_burn_rate/lib/get_slo_burn_rate_alerts_client';
export interface SLOListItem {
  name: string;
  type: SLOWithSummaryResponse['indicator']['type'];
  sliValue: SLOWithSummaryResponse['summary']['sliValue'];
  status: SLOWithSummaryResponse['summary']['status'];
  errorBudget: SLOWithSummaryResponse['summary']['errorBudget'];
}

export function registerGetSLOListFunction({
  sloClient,
  resources,
  registerFunction,
}: FunctionRegistrationParameters) {
  registerFunction(
    {
      name: 'get_slo_list',
      contexts: ['slo'],
      description: `Gets a list of SLOs`,
      descriptionForUser: i18n.translate(
        'xpack.observability.observabilityAiAssistant.functions.registerGetSLOList.descriptionForUser',
        {
          defaultMessage: `
            Gets the list of configured SLOs, their status, and alerts.
        `,
        }
      ),
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          'slo.name': {
            type: 'string',
            description: 'Optionally filter the slos by name',
            items: {
              type: 'string',
            },
          },
          'slo.indicator.type': {
            type: 'string',
            description: 'Optionally filter the slos by the indicator type',
            items: {
              type: 'string',
              additionalProperties: false,
              additionalItems: false,
              enum: indicators,
            },
          },
          status: {
            type: 'array',
            description: 'Filter service list by health status',
            additionalProperties: false,
            additionalItems: false,
            items: {
              type: 'string',
              enum: ['VIOLATED', 'DEGRADING', 'HEALTHY'],
            },
          },
        },
      } as const,
    },
    async ({ arguments: args }, signal) => {
      const { status, 'slo.indicator.type': type, 'slo.name': name } = args;
      const params = {
        kqlQuery: '',
        page: '1',
        perPage: '25',
      };
      if (status) {
        params.kqlQuery += `status: "${status}" and`;
      }
      if (type) {
        params.kqlQuery += `slo.indicator.type: "${type}" and`;
      }
      if (name) {
        params.kqlQuery += `slo.name: "${name}*"`;
      }
      const esFilters = kqlQuery(params.kqlQuery);
      const slos = await sloClient.find.execute(params);
      const { request, dependencies } = resources;
      const filteredIds: string[] = [];

      const mappedItems = slos.results.map((item): SLOListItem => {
        filteredIds.push(item.id);
        return {
          name: item.name,
          type: item.indicator.type,
          sliValue: item.summary.sliValue,
          status: item.summary.status,
          errorBudget: item.summary.errorBudget,
        };
      });

      const alertsClient = await getSLOAlertsClient({ dependencies, request });

      const alertSearchParams = {
        size: 100,
        track_total_hits: false,
        query: {
          bool: {
            filter: [
              { term: { [ALERT_RULE_PRODUCER]: 'slo' } },
              { term: { [ALERT_STATUS]: ALERT_STATUS_ACTIVE } },
              { terms: { 'slo.id': filteredIds } },
            ],
          },
        },
      };

      const alerts = await alertsClient.search(alertSearchParams);
      const formattedAlerts = alerts.hits.hits.map((hit) => {
        const shortWindow = hit._source['kibana.alert.rule.parameters'].windows.find(
          (window) => window.burnRateThreshold === hit._source['kibana.alert.evaluation.threshold']
        )?.shortWindow;
        const longWindow = hit._source['kibana.alert.rule.parameters'].windows.find(
          (window) => window.burnRateThreshold === hit._source['kibana.alert.evaluation.threshold']
        )?.longWindow;
        const hitWithWindow = {
          ...hit._source,
          shortWindow,
          longWindow,
        };
        return hitWithWindow;
      });

      return {
        content: {
          slos: mappedItems,
          alerts: formattedAlerts,
        },
      };
    }
  );
}

// how to pass space id to assistant
// how to add labels to table
// how to add links to apps to your responses

// improving natural language model, having to provide more context

// What I've learned
// match labels from the results of one function to the parameters of another function. Ex: alertStart
