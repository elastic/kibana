/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { APMConfig } from '../..';
import {
  InstructionsSchema,
  INSTRUCTION_VARIANT,
} from '../../../../../../src/plugins/home/server';
import {
  createDownloadServerDeb,
  createDownloadServerOsx,
  createDownloadServerRpm,
  createEditConfig,
  createStartServerUnix,
  createStartServerUnixSysv,
  createWindowsServerInstructions,
} from '../../../common/tutorial/instructions/apm_server_instructions';

const EDIT_CONFIG = createEditConfig();
const START_SERVER_UNIX = createStartServerUnix();
const START_SERVER_UNIX_SYSV = createStartServerUnixSysv();

export function getOnPremApmServerInstructionSet({
  apmConfig,
  isFleetPluginEnabled,
}: {
  apmConfig: APMConfig;
  isFleetPluginEnabled: boolean;
}): InstructionsSchema['instructionSets'][0] {
  return {
    title: i18n.translate('xpack.apm.tutorial.apmServer.title', {
      defaultMessage: 'APM Server',
    }),
    callOut: {
      title: i18n.translate('xpack.apm.tutorial.apmServer.callOut.title', {
        defaultMessage: 'Important: Updating to 7.0 or higher',
      }),
      message: i18n.translate('xpack.apm.tutorial.apmServer.callOut.message', {
        defaultMessage: `Please make sure your APM Server is updated to 7.0 or higher. \
            You can also migrate your 6.x data with the migration assistant found in Kibana's management section.`,
      }),
      iconType: 'alert',
    },
    instructionVariants: [
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
        id: INSTRUCTION_VARIANT.OSX,
        instructions: [
          createDownloadServerOsx(),
          EDIT_CONFIG,
          START_SERVER_UNIX,
        ],
      },
      {
        id: INSTRUCTION_VARIANT.WINDOWS,
        instructions: createWindowsServerInstructions(),
      },
      // hides fleet section when plugin is disabled
      ...(isFleetPluginEnabled
        ? [
            {
              id: INSTRUCTION_VARIANT.FLEET,
              instructions: [
                {
                  title: i18n.translate('xpack.apm.tutorial.fleet.title', {
                    defaultMessage: 'Fleet',
                  }),
                  customComponentName: 'TutorialFleetInstructions',
                },
              ],
              initialSelected: true,
            },
          ]
        : []),
    ],
    statusCheck: {
      title: i18n.translate('xpack.apm.tutorial.apmServer.statusCheck.title', {
        defaultMessage: 'APM Server status',
      }),
      text: i18n.translate('xpack.apm.tutorial.apmServer.statusCheck.text', {
        defaultMessage:
          'Make sure APM Server is running before you start implementing the APM agents.',
      }),
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
        index: apmConfig.indices.onboarding,
        query: {
          bool: {
            filter: [{ term: { 'processor.event': 'onboarding' } }],
          },
        },
      },
    },
  };
}
