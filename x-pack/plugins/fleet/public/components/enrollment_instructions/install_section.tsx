/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { InstallationMessage } from '../agent_enrollment_flyout/installation_message';

import type { K8sMode } from '../agent_enrollment_flyout/types';

import type { CommandsByPlatform } from '../../applications/fleet/sections/agents/agent_requirements_page/components/install_command_utils';

import { PlatformSelector } from './manual/platform_selector';

interface Props {
  installCommand: CommandsByPlatform;
  isK8s: K8sMode | undefined;
}

export const InstallSection: React.FunctionComponent<Props> = ({ installCommand, isK8s }) => {
  return (
    <>
      <InstallationMessage isK8s={isK8s} />
      <PlatformSelector
        linuxCommand={installCommand.linux}
        macCommand={installCommand.mac}
        windowsCommand={installCommand.windows}
        linuxDebCommand={installCommand.deb}
        linuxRpmCommand={installCommand.rpm}
        isK8s={isK8s === 'IS_KUBERNETES'}
      />
    </>
  );
};
