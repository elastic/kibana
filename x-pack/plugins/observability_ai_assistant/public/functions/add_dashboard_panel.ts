/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RegisterFunctionDefinition } from '../../common/types';
import type { ObservabilityAIAssistantService } from '../types';
import {getLensConfig} from "./prepare_lens_config";
import {ObservabilityAIAssistantPluginStartDependencies} from "../types";

export function registerAddPanelToDashboardFunction({
  service,
  registerFunction,
  pluginsStart,
}: {
  service: ObservabilityAIAssistantService;
  registerFunction: RegisterFunctionDefinition;
  pluginsStart: ObservabilityAIAssistantPluginStartDependencies;
}) {
  registerFunction(
    {
      name: 'add_dashboard_panel',
      contexts: ['dashboards'],
      description: `Use this function to add a panel to current dashboard. You should provide same configuration as you would to lens function to render a chart except that this will add a panel to current dashboard.`,
      descriptionForUser:
        'This function allows the assistant to add a panel to current dashboard.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          config: {
            type: 'string',
            description:
              'stringified json of a configuration that would be provided to lens function',
          },
        },
        required: ['config'],
      } as const,
    },
    async ({ arguments: { config }}) => {
      getLensConfig(pluginsStart.lens, pluginsStart.dataViews, JSON.parse(config)).then((parsedConfig) => {
        // @ts-ignore
        window._dashboardAPI.addNewEmbeddable('lens', parsedConfig);
      });

      return {
        content: {},
      };
    },
    ({ arguments: { config }}) => {


      return null;
    },
  );
}
