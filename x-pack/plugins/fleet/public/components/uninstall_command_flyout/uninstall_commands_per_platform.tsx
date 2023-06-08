/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup, EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';

import type { PLATFORMS_FOR_UNINSTALL } from './types';
import type { Commands } from './types';

const generateUninstallCommands = (token: string) => ({
  linuxOrMac: `sudo elastic-agent uninstall --uninstall-token ${token}`,
  windows: `C:\\"Program Files"\\Elastic\\Agent\\elastic-agent.exe uninstall --uninstall-token ${token}`,
});

const PLATFORM_OPTIONS: Array<{ id: PLATFORMS_FOR_UNINSTALL; label: string }> = [
  {
    id: 'linuxOrMac',
    label: i18n.translate('xpack.fleet.agentUninstallCommandFlyout.platformButtons.linuxOrMac', {
      defaultMessage: 'Linux or Mac',
    }),
  },
  {
    id: 'windows',
    label: i18n.translate('xpack.fleet.agentUninstallCommandFlyout.platformButtons.windows', {
      defaultMessage: 'Windows',
    }),
  },
];

interface Props {
  token: string;
}

export const UninstallCommandsPerPlatform: React.FunctionComponent<Props> = ({ token }) => {
  const [platform, setPlatform] = useState<PLATFORMS_FOR_UNINSTALL>('linuxOrMac');

  const commands: Commands = useMemo(() => generateUninstallCommands(token), [token]);

  return (
    <>
      <EuiButtonGroup
        options={PLATFORM_OPTIONS}
        idSelected={platform}
        onChange={(id) => setPlatform(id as PLATFORMS_FOR_UNINSTALL)}
        legend={i18n.translate('xpack.fleet.agentUninstallCommandFlyout.platformSelectAriaLabel', {
          defaultMessage: 'Platform',
        })}
        buttonSize="m"
        data-test-subj="uninstall-commands-flyout-platforms-btn-group"
      />

      <EuiSpacer size="l" />

      <EuiCodeBlock
        fontSize="m"
        isCopyable
        paddingSize="m"
        data-test-subj="uninstall-commands-flyout-code-block"
      >
        {commands[platform]}
      </EuiCodeBlock>
    </>
  );
};
