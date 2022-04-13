/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { APMConfig } from '../..';
import {
  INSTRUCTION_VARIANT,
  InstructionsSchema,
} from '../../../../../../src/plugins/home/server';
import {
  createDjangoAgentInstructions,
  createDotNetAgentInstructions,
  createFlaskAgentInstructions,
  createGoAgentInstructions,
  createJavaAgentInstructions,
  createJsAgentInstructions,
  createNodeAgentInstructions,
  createPhpAgentInstructions,
  createRackAgentInstructions,
  createRailsAgentInstructions,
} from '../../../common/tutorial/instructions/apm_agent_instructions';
import { getOnPremApmServerInstructionSet } from './on_prem_apm_server_instruction_set';

export function onPremInstructions({
  apmConfig,
  isFleetPluginEnabled,
}: {
  apmConfig: APMConfig;
  isFleetPluginEnabled: boolean;
}): InstructionsSchema {
  return {
    instructionSets: [
      getOnPremApmServerInstructionSet({ apmConfig, isFleetPluginEnabled }),
      {
        title: i18n.translate('xpack.apm.tutorial.apmAgents.title', {
          defaultMessage: 'APM Agents',
        }),
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.JAVA,
            instructions: createJavaAgentInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.JS,
            instructions: createJsAgentInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.NODE,
            instructions: createNodeAgentInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.DJANGO,
            instructions: createDjangoAgentInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.FLASK,
            instructions: createFlaskAgentInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.RAILS,
            instructions: createRailsAgentInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.RACK,
            instructions: createRackAgentInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.GO,
            instructions: createGoAgentInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.DOTNET,
            instructions: createDotNetAgentInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.PHP,
            instructions: createPhpAgentInstructions(),
          },
        ],
        statusCheck: {
          title: i18n.translate(
            'xpack.apm.tutorial.apmAgents.statusCheck.title',
            {
              defaultMessage: 'Agent status',
            }
          ),
          text: i18n.translate(
            'xpack.apm.tutorial.apmAgents.statusCheck.text',
            {
              defaultMessage:
                'Make sure your application is running and the agents are sending data.',
            }
          ),
          btnLabel: i18n.translate(
            'xpack.apm.tutorial.apmAgents.statusCheck.btnLabel',
            {
              defaultMessage: 'Check agent status',
            }
          ),
          success: i18n.translate(
            'xpack.apm.tutorial.apmAgents.statusCheck.successMessage',
            {
              defaultMessage:
                'Data successfully received from one or more agents',
            }
          ),
          error: i18n.translate(
            'xpack.apm.tutorial.apmAgents.statusCheck.errorMessage',
            {
              defaultMessage: 'No data has been received from agents yet',
            }
          ),
          esHitsCheck: {
            index: [
              apmConfig.indices.error,
              apmConfig.indices.transaction,
              apmConfig.indices.metric,
            ],
            query: {
              bool: {
                filter: [
                  {
                    terms: {
                      'processor.event': ['error', 'transaction', 'metric'],
                    },
                  },
                ],
              },
            },
          },
        },
      },
    ],
  };
}
