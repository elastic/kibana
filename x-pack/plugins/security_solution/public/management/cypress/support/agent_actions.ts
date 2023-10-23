/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// / <reference types="cypress" />
import type { ExecaReturnValue } from 'execa';
import execa from 'execa';

import { VAGRANT_CWD } from '../../../../scripts/endpoint/common/endpoint_host_services';

export const agentActions = (on: Cypress.PluginEvents): void => {
  on('task', {
    uninstallAgentFromHost: async ({
      hostname,
      uninstallToken,
    }: {
      hostname: string;
      uninstallToken?: string;
    }): Promise<string> => {
      let result;
      try {
        if (process.env.CI) {
          result = await execa(
            'vagrant',
            [
              'ssh',
              '--',
              `sudo elastic-agent uninstall -f ${
                uninstallToken ? `--uninstall-token ${uninstallToken}` : ''
              }`,
            ],
            {
              env: {
                VAGRANT_CWD,
              },
            }
          );
        } else {
          result = await execa(`multipass`, [
            'exec',
            hostname,
            '--',
            'sh',
            '-c',
            `sudo elastic-agent uninstall -f ${
              uninstallToken ? `--uninstall-token ${uninstallToken}` : ''
            }`,
          ]);
        }
      } catch (err) {
        return err.stderr;
      }
      return result.stdout;
    },

    isAgentAndEndpointUninstalledFromHost: async ({
      hostname,
    }: {
      hostname: string;
      uninstallToken?: string;
    }): Promise<boolean> => {
      let execaReturnValue: ExecaReturnValue<string>;
      if (process.env.CI) {
        execaReturnValue = await execa('vagrant', ['ssh', '--', `ls /opt/Elastic`], {
          env: {
            VAGRANT_CWD,
          },
        });
      } else {
        execaReturnValue = await execa(`multipass`, [
          'exec',
          hostname,
          '--',
          'sh',
          '-c',
          `ls /opt/Elastic`,
        ]);
      }

      if (execaReturnValue.stdout === '') {
        return true;
      }

      return false;
    },
  });
};
