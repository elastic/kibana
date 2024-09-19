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
import {
  createDownloadServerDeb,
  createDownloadServerOsx,
  createDownloadServerRpm,
  createEditConfig,
  createStartServerUnix,
  createStartServerUnixSysv,
  createWindowsServerInstructions,
} from '../../../common/tutorial/instructions/apm_server_instructions';

export function onPremInstructions({
  apmConfig,
  isFleetPluginEnabled,
}: {
  apmConfig: Pick<
    APMConfig,
    | 'apm_oss.errorIndices'
    | 'apm_oss.transactionIndices'
    | 'apm_oss.metricsIndices'
    | 'apm_oss.onboardingIndices'
  >;
  isFleetPluginEnabled: boolean;
}): InstructionsSchema {
  const EDIT_CONFIG = createEditConfig();
  const START_SERVER_UNIX = createStartServerUnix();
  const START_SERVER_UNIX_SYSV = createStartServerUnixSysv();

  return {
    instructionSets: [
      {
        title: i18n.translate('xpack.apm.tutorial.apmServer.title', {
          defaultMessage: 'APM Server',
        }),
        callOut: {
          title: i18n.translate('xpack.apm.tutorial.apmServer.callOut.title', {
            defaultMessage: 'Important: Updating to 7.0 or higher',
          }),
          message: i18n.translate(
            'xpack.apm.tutorial.apmServer.callOut.message',
            {
              defaultMessage: `Please make sure your APM Server is updated to 7.0 or higher. \
            You can also migrate your 6.x data with the migration assistant found in Kibana's management section.`,
            }
          ),
          iconType: 'alert',
        },
        instructionVariants: [
          // hides fleet section when plugin is disabled
          ...(isFleetPluginEnabled
            ? [
                {
                  id: INSTRUCTION_VARIANT.FLEET,
                  instructions: [
                    { customComponentName: 'TutorialFleetInstructions' },
                  ],
                },
              ]
            : []),
          {
            id: INSTRUCTION_VARIANT.OSX,
            instructions: [
              createDownloadServerOsx(),
              EDIT_CONFIG,
              START_SERVER_UNIX,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              createDownloadServerDeb(),
              EDIT_CONFIG,
              START_SERVER_UNIX_SYSV,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              createDownloadServerRpm(),
              EDIT_CONFIG,
              START_SERVER_UNIX_SYSV,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: createWindowsServerInstructions(),
          },
        ],
        statusCheck: {
          title: i18n.translate(
            'xpack.apm.tutorial.apmServer.statusCheck.title',
            {
              defaultMessage: 'APM Server status',
            }
          ),
          text: i18n.translate(
            'xpack.apm.tutorial.apmServer.statusCheck.text',
            {
              defaultMessage:
                'Make sure APM Server is running before you start implementing the APM agents.',
            }
          ),
          btnLabel: i18n.translate(
            'xpack.apm.tutorial.apmServer.statusCheck.btnLabel',
            {
              defaultMessage: 'Check APM Server status',
            }
          ),
          success: i18n.translate(
            'xpack.apm.tutorial.apmServer.statusCheck.successMessage',
            {
              defaultMessage: 'You have correctly setup APM Server',
            }
          ),
          error: i18n.translate(
            'xpack.apm.tutorial.apmServer.statusCheck.errorMessage',
            {
              defaultMessage:
                'No APM Server detected. Please make sure it is running and you have updated to 7.0 or higher.',
            }
          ),
          esHitsCheck: {
            index: apmConfig['apm_oss.onboardingIndices'],
            query: {
              bool: {
                filter: [
                  { term: { 'processor.event': 'onboarding' } },
                  { range: { 'observer.version_major': { gte: 7 } } },
                ],
              },
            },
          },
        },
      },
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
              apmConfig['apm_oss.errorIndices'],
              apmConfig['apm_oss.transactionIndices'],
              apmConfig['apm_oss.metricsIndices'],
            ],
            query: {
              bool: {
                filter: [
                  {
                    terms: {
                      'processor.event': ['error', 'transaction', 'metric'],
                    },
                  },
                  { range: { 'observer.version_major': { gte: 7 } } },
                ],
              },
            },
          },
        },
      },
    ],
  };
}
