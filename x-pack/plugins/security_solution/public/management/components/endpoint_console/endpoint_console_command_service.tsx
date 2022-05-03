/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointStatusActionResult } from './action_handlers/status_action';
import { HostMetadata } from '../../../../common/endpoint/types';
import { CommandServiceInterface, CommandDefinition } from '../console';
import { IsolateActionResult } from './action_handlers/isolate_action';

/**
 * Endpoint specific Response Actions (commands) for use with Console.
 */
export class EndpointConsoleCommandService implements CommandServiceInterface {
  constructor(private readonly endpointMetadata: HostMetadata) {}

  getCommandList(): CommandDefinition[] {
    return [
      {
        name: 'isolate',
        about: 'Isolate the host',
        RenderComponent: IsolateActionResult,
        meta: {
          endpointId: this.endpointMetadata.agent.id,
        },
        args: {
          comment: {
            required: false,
            allowMultiples: false,
            about: 'A comment to go along with the action',
          },
        },
      },
      {
        name: 'status',
        about: 'Display the latest status information for the Endpoint',
        RenderComponent: EndpointStatusActionResult,
        meta: {
          endpointId: this.endpointMetadata.agent.id,
        },
      },
    ];
  }
}
