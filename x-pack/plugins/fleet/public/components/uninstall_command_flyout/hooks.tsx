/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { REDUCED_PLATFORM_OPTIONS } from '../../hooks';

import type { Commands, UninstallCommandTarget } from './types';

// todo: update with real API
export const useCommands = (
  policyId: string | undefined,
  target: UninstallCommandTarget
): Commands => {
  const commands = useMemo(
    () =>
      REDUCED_PLATFORM_OPTIONS.map(({ id }) => id).reduce<Commands>(
        (_commands, platform) => ({
          ..._commands,
          [platform]: policyId
            ? `${platform}/${target} command for ${policyId}`
            : `${platform}/${target} command`,
        }),
        {}
      ),
    [policyId, target]
  );

  return commands;
};
