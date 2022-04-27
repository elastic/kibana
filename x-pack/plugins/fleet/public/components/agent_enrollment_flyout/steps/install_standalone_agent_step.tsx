/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import type { CommandsByPlatform } from '../../../applications/fleet/components/fleet_server_instructions/utils/install_command_utils';

import { InstallSection } from '../../enrollment_instructions/install_section';

import type { K8sMode } from '../types';

export const InstallStandaloneAgentStep = ({
  installCommand,
  isK8s,
}: {
  installCommand: CommandsByPlatform;
  isK8s?: K8sMode;
}): EuiContainedStepProps => {
  return {
    title: i18n.translate('xpack.fleet.agentEnrollment.stepEnrollAndRunAgentTitle', {
      defaultMessage: 'Install Elastic Agent on your host',
    }),
    children: <InstallSection installCommand={installCommand} isK8s={isK8s} />,
  };
};
