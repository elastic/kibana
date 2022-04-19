/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CommandExecutionResponse } from '../console/types';
import { EndpointError } from '../../../../common/endpoint/errors';
import { handleIsolateAction } from './action_handlers';
import { HostInfo } from '../../../../common/endpoint/types';
import { CommandServiceInterface, CommandDefinition, Command } from '../console';

/**
 * Endpoint specific Response Actions (commands) for use with Console.
 */
export class EndpointConsoleCommandService implements CommandServiceInterface {
  constructor(private readonly endpointHostInfo: HostInfo) {}

  getCommandList(): CommandDefinition[] {
    return [
      {
        name: 'isolate',
        about: 'Isolate the host',
        args: {
          comment: {
            required: false,
            allowMultiples: false,
            about: 'A comment to go along with the action',
          },
        },
      },
    ];
  }

  async executeCommand(command: Command): Promise<CommandExecutionResponse> {
    switch (command.args.name) {
      case 'isolate':
        return handleIsolateAction(this.endpointHostInfo, command);
      default:
        throw new EndpointError(
          i18n.translate('xpack.securitySolution.endpointResponseActions.unknownAction', {
            defaultMessage: "Unknown action '{name}'",
            values: { name: command.args.name },
          })
        );
    }
  }
}
