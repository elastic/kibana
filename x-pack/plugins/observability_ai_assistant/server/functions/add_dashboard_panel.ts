/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FunctionRegistrationParameters } from '.';

export function registerAddPanelToDashboardFunction({
  client,
  resources,
  registerFunction,
}: FunctionRegistrationParameters) {
  registerFunction(
    {
      name: 'add_dashboard_panel',
      contexts: ['dashboards'],
      description: `Use this function to add a panel to current dashboard. You should extract the lens attributes from the visualize_esql function.`,
      descriptionForUser: 'This function allows the assistant to add a panel to current dashboard.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          config: {
            type: 'string',
            description: 'lens attributes of the chart',
          },
        },
        required: ['config'],
      } as const,
    },
    async ({ arguments: { config } }) => {
      const coreContext = await resources.context.core;

      // @ts-ignore
      window._dashboardAPI.addNewEmbeddable('lens', {
        id: undefined,
        attributes: {
          type: 'lens',
          ...JSON.parse(config),
        },
      });
      // window._dashboardAPI.addNewPanel({
      //   panelType: 'lens',
      //   initialState: {
      //     attributes: JSON.parse(config),
      //     id: 'custom',
      //   },
      // });
      return {
        content: {},
      };
    }
  );
}
