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
import { KillProcessActionResult } from './kill_process_action';
import { EndpointStatusActionResult } from './status_action';
import { GetRunningProcessesActionResult } from './get_running_processes_action';
import type { ParsedArgData } from '../console/service/parsed_command_input';

const emptyArgumentValidator = (argData: ParsedArgData) => {
  if (argData?.length > 0 && argData[0]?.trim().length > 0) {
    return true;
  } else {
    return 'Argument cannot be empty';
  }
};

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
      exampleUsage: 'isolate --comment "isolate this host"',
      exampleInstruction: 'Hit enter to execute or add an optional comment',
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
      exampleUsage: 'release --comment "isolate this host"',
      exampleInstruction: 'Hit enter to execute or add an optional comment',
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
      name: 'kill-process',
      about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.killProcess.about', {
        defaultMessage: 'Kill a running process',
      }),
      RenderComponent: KillProcessActionResult,
      meta: {
        endpointId: endpointAgentId,
      },
      exampleUsage: 'kill-process --pid 123',
      exampleInstruction: 'Enter a pid or an entity id to execute',
      mustHaveArgs: true,
      args: {
        comment: {
          required: false,
          allowMultiples: false,
          about: i18n.translate(
            'xpack.securitySolution.endpointConsoleCommands.release.arg.comment',
            { defaultMessage: 'A comment to go along with the action' }
          ),
        },
        pid: {
          required: false,
          allowMultiples: false,
          exclusiveOr: true,
          about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.pid.arg.comment', {
            defaultMessage:
              'A PID representing the process to kill.  You can enter a pid or an entity id, but not both.',
          }),
          validate: emptyArgumentValidator,
        },
        entityId: {
          required: false,
          allowMultiples: false,
          exclusiveOr: true,
          about: i18n.translate(
            'xpack.securitySolution.endpointConsoleCommands.entityId.arg.comment',
            {
              defaultMessage:
                'An entity id representing the process to kill.  You can enter a pid or an entity id, but not both.',
            }
          ),
          validate: emptyArgumentValidator,
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
    {
      name: 'running-processes',
      about: i18n.translate(
        'xpack.securitySolution.endpointConsoleCommands.runninProcesses.about',
        {
          defaultMessage: 'Display the running processes on the endpoint',
        }
      ),
      RenderComponent: GetRunningProcessesActionResult,
      meta: {
        endpointId: endpointAgentId,
      },
      exampleUsage: 'processes --comment "get the processes"',
      exampleInstruction: 'Hit enter to execute or add an optional comment',
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
  ];
};
