/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { INSTRUCTION_VARIANT } from '../../../../../src/plugins/home/server';

import {
  createNodeAgentInstructions,
  createDjangoAgentInstructions,
  createFlaskAgentInstructions,
  createRailsAgentInstructions,
  createRackAgentInstructions,
  createJsAgentInstructions,
  createGoAgentInstructions,
  createJavaAgentInstructions,
  createDotNetAgentInstructions,
} from '../../../../../src/plugins/apm_oss/server';
import { CloudSetup } from '../../../cloud/server';

export function createElasticCloudInstructions(cloudSetup?: CloudSetup) {
  const apmServerUrl = cloudSetup?.apm.url;
  const instructionSets = [];

  if (!apmServerUrl) {
    instructionSets.push(getApmServerInstructionSet(cloudSetup));
  }

  instructionSets.push(getApmAgentInstructionSet(cloudSetup));

  return {
    instructionSets,
  };
}

function getApmServerInstructionSet(cloudSetup?: CloudSetup) {
  const cloudId = cloudSetup?.cloudId;
  return {
    title: i18n.translate('xpack.apm.tutorial.apmServer.title', {
      defaultMessage: 'APM Server',
    }),
    instructionVariants: [
      {
        id: INSTRUCTION_VARIANT.ESC,
        instructions: [
          {
            title: 'Enable the APM Server in the ESS console',
            textPre: i18n.translate('xpack.apm.tutorial.elasticCloud.textPre', {
              defaultMessage:
                'To enable the APM Server go to [the Elastic Cloud console](https://cloud.elastic.co/deployments?q={cloudId}) and enable APM in the deployment settings. Once enabled, refresh this page.',
              values: { cloudId },
            }),
          },
        ],
      },
    ],
  };
}

function getApmAgentInstructionSet(cloudSetup?: CloudSetup) {
  const apmServerUrl = cloudSetup?.apm.url;
  const secretToken = cloudSetup?.apm.secretToken;

  return {
    title: i18n.translate('xpack.apm.tutorial.elasticCloudInstructions.title', {
      defaultMessage: 'APM Agents',
    }),
    instructionVariants: [
      {
        id: INSTRUCTION_VARIANT.NODE,
        instructions: createNodeAgentInstructions(apmServerUrl, secretToken),
      },
      {
        id: INSTRUCTION_VARIANT.DJANGO,
        instructions: createDjangoAgentInstructions(apmServerUrl, secretToken),
      },
      {
        id: INSTRUCTION_VARIANT.FLASK,
        instructions: createFlaskAgentInstructions(apmServerUrl, secretToken),
      },
      {
        id: INSTRUCTION_VARIANT.RAILS,
        instructions: createRailsAgentInstructions(apmServerUrl, secretToken),
      },
      {
        id: INSTRUCTION_VARIANT.RACK,
        instructions: createRackAgentInstructions(apmServerUrl, secretToken),
      },
      {
        id: INSTRUCTION_VARIANT.JS,
        instructions: createJsAgentInstructions(apmServerUrl),
      },
      {
        id: INSTRUCTION_VARIANT.GO,
        instructions: createGoAgentInstructions(apmServerUrl, secretToken),
      },
      {
        id: INSTRUCTION_VARIANT.JAVA,
        instructions: createJavaAgentInstructions(apmServerUrl, secretToken),
      },
      {
        id: INSTRUCTION_VARIANT.DOTNET,
        instructions: createDotNetAgentInstructions(apmServerUrl, secretToken),
      },
    ],
  };
}
