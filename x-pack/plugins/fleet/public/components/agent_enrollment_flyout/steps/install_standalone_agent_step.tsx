/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import type { CommandsByPlatform } from '../../../applications/fleet/sections/agents/agent_requirements_page/components/install_command_utils';
import { PlatformSelector } from '../../enrollment_instructions/manual/platform_selector';

import { InstallationMessage } from '../installation_message';

export const InstallStandaloneAgentStep = ({
  installCommand,
  isK8s,
  selectedPolicyId,
}: {
  installCommand: CommandsByPlatform;
  isK8s: string;
  selectedPolicyId?: string;
}): EuiContainedStepProps => {
  return {
    title: i18n.translate('xpack.fleet.agentEnrollment.stepEnrollAndRunAgentTitle', {
      defaultMessage: 'Install Elastic Agent on your host',
    }),
    children: (
      <>
        <InstallationMessage />
        <PlatformSelector
          linuxCommand={installCommand.linux}
          macCommand={installCommand.mac}
          windowsCommand={installCommand.windows}
          linuxDebCommand={installCommand.deb}
          linuxRpmCommand={installCommand.rpm}
          isK8s={isK8s === 'IS_KUBERNETES'}
        />
      </>
    ),
  };
};
