/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CommandDefinition } from '../console';
import { IsolateActionResult } from './isolate_action';
import { ReleaseActionResult } from './release_action';
import { EndpointStatusActionResult } from './status_action';

export const getEndpointResponseActionsConsoleCommands = (
  endpointAgentId: string
): CommandDefinition[] => {
  return [
    {
      name: 'isolate',
      about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.isolate.about', {
        defaultMessage: 'Isolate the host',
      }),
      RenderComponent: IsolateActionResult,
      meta: {
        endpointId: endpointAgentId,
      },
      args: {
        comment: {
          required: false,
          allowMultiples: false,
          about: i18n.translate(
            'xpack.securitySolution.endpointConsoleCommands.isolate.arg.comment',
            { defaultMessage: 'A comment to go along with the action' }
          ),
        },
      },
    },
    {
      name: 'release',
      about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.release.about', {
        defaultMessage: 'Release the host',
      }),
      RenderComponent: ReleaseActionResult,
      meta: {
        endpointId: endpointAgentId,
      },
      args: {
        comment: {
          required: false,
          allowMultiples: false,
          about: i18n.translate(
            'xpack.securitySolution.endpointConsoleCommands.release.arg.comment',
            { defaultMessage: 'A comment to go along with the action' }
          ),
        },
      },
    },
    {
      name: 'status',
      about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.status.about', {
        defaultMessage: 'Display the latest status information for the Endpoint',
      }),
      RenderComponent: EndpointStatusActionResult,
      meta: {
        endpointId: endpointAgentId,
      },
    },
  ];
};
