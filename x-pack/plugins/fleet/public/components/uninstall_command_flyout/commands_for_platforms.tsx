/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup, EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

import type { PLATFORM_TYPE } from '../../hooks';
import { PLATFORM_OPTIONS, usePlatform } from '../../hooks';

import type { Commands } from './types';

interface Props {
  commands: Commands;
}

export const CommandsForPlatforms: React.FunctionComponent<Props> = ({ commands }) => {
  const { platform, setPlatform } = usePlatform();

  const options = useMemo(
    () => PLATFORM_OPTIONS.filter(({ id }) => commands[id as PLATFORM_TYPE]),
    [commands]
  );

  return (
    <>
      <EuiButtonGroup
        options={options}
        idSelected={platform}
        onChange={(id) => setPlatform(id as PLATFORM_TYPE)}
        legend={i18n.translate('xpack.fleet.agentUninstallCommandFlyout.platformSelectAriaLabel', {
          defaultMessage: 'Platform',
        })}
        data-test-subj="uninstall-commands-flyout-platforms-btn-group"
      />

      <EuiSpacer size="s" />

      <EuiCodeBlock fontSize="m" isCopyable paddingSize="m">
        {commands[platform]}
      </EuiCodeBlock>
    </>
  );
};
