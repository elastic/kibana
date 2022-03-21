/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiCode } from '@elastic/eui';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useUrlParams } from '../../../components/hooks/use_url_params';
import {
  Command,
  CommandDefinition,
  CommandServiceInterface,
  Console,
} from '../../../components/console';

const delay = async (ms: number = 4000) => new Promise((r) => setTimeout(r, ms));

class DevCommandService implements CommandServiceInterface {
  getCommandList(): CommandDefinition[] {
    return [
      {
        name: 'cmd1',
        about: 'Runs cmd1',
      },
      {
        name: 'cmd2',
        about: 'runs cmd 2',
        args: {
          file: {
            required: true,
            allowMultiples: false,
            about: 'Includes file in the run',
            validate: () => {
              return true;
            },
          },
          bad: {
            required: false,
            allowMultiples: false,
            about: 'will fail validation',
            validate: () => 'This is a bad value',
          },
        },
      },
      {
        name: 'cmd-long-delay',
        about: 'runs cmd 2',
      },
    ];
  }

  async executeCommand(command: Command): Promise<{ result: React.ReactNode }> {
    await delay();

    if (command.commandDefinition.name === 'cmd-long-delay') {
      await delay(20000);
    }

    return {
      result: (
        <div>
          <div>{`${command.commandDefinition.name}`}</div>
          <div>{`command input: ${command.input}`}</div>
          <EuiCode>{JSON.stringify(command.args, null, 2)}</EuiCode>
        </div>
      ),
    };
  }
}

// ------------------------------------------------------------
// FOR DEV PURPOSES ONLY
// FIXME:PT Delete once we have support via row actions menu
// ------------------------------------------------------------
export const DevConsole = memo(() => {
  const isConsoleEnabled = useIsExperimentalFeatureEnabled('responseActionsConsoleEnabled');

  const consoleService = useMemo(() => {
    return new DevCommandService();
  }, []);

  const {
    urlParams: { showConsole = false },
  } = useUrlParams();

  return isConsoleEnabled && showConsole ? (
    <div style={{ height: '400px' }}>
      <Console prompt="$$>" consoleService={consoleService} data-test-subj="dev" />
    </div>
  ) : null;
});
DevConsole.displayName = 'DevConsole';
