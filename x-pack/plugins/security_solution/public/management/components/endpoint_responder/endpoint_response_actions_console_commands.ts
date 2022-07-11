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
import { SuspendProcessActionResult } from './suspend_process_action';
import { EndpointStatusActionResult } from './status_action';
import { GetProcessesActionResult } from './get_processes_action';
import type { ParsedArgData } from '../console/service/parsed_command_input';

const emptyArgumentValidator = (argData: ParsedArgData) => {
  if (argData?.length > 0 && argData[0]?.trim().length > 0) {
    return true;
  } else {
    return 'Argument cannot be empty';
  }
};

const HELP_GROUPS = Object.freeze({
  responseActions: {
    position: 0,
    label: i18n.translate('xpack.securitySolution.endpointConsoleCommands.groups.responseActions', {
      defaultMessage: 'Response actions',
    }),
  },
});

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
      helpGroupLabel: HELP_GROUPS.responseActions.label,
      helpGroupPosition: HELP_GROUPS.responseActions.position,
      helpCommandPosition: 0,
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
      helpGroupLabel: HELP_GROUPS.responseActions.label,
      helpGroupPosition: HELP_GROUPS.responseActions.position,
      helpCommandPosition: 1,
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
      exampleUsage: 'kill-process --pid 123 --comment "kill this process"',
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
      helpGroupLabel: HELP_GROUPS.responseActions.label,
      helpGroupPosition: HELP_GROUPS.responseActions.position,
      helpCommandPosition: 4,
    },
    {
      name: 'suspend-process',
      about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.suspendProcess.about', {
        defaultMessage: 'Suspend a running process',
      }),
      RenderComponent: SuspendProcessActionResult,
      meta: {
        endpointId: endpointAgentId,
      },
      exampleUsage: 'suspend-process --pid 123 --comment "suspend this process"',
      exampleInstruction: 'Enter a pid or an entity id to execute',
      mustHaveArgs: true,
      args: {
        comment: {
          required: false,
          allowMultiples: false,
          about: i18n.translate(
            'xpack.securitySolution.endpointConsoleCommands.suspendProcess.arg.comment',
            { defaultMessage: 'A comment to go along with the action' }
          ),
        },
        pid: {
          required: false,
          allowMultiples: false,
          exclusiveOr: true,
          about: i18n.translate(
            'xpack.securitySolution.endpointConsoleCommands.suspendProcess.pid.arg.comment',
            {
              defaultMessage:
                'A PID representing the process to suspend.  You can enter a pid or an entity id, but not both.',
            }
          ),
          validate: emptyArgumentValidator,
        },
        entityId: {
          required: false,
          allowMultiples: false,
          exclusiveOr: true,
          about: i18n.translate(
            'xpack.securitySolution.endpointConsoleCommands.suspendProcess.entityId.arg.comment',
            {
              defaultMessage:
                'An entity id representing the process to suspend.  You can enter a pid or an entity id, but not both.',
            }
          ),
          validate: emptyArgumentValidator,
        },
      },
      helpGroupLabel: HELP_GROUPS.responseActions.label,
      helpGroupPosition: HELP_GROUPS.responseActions.position,
      helpCommandPosition: 5,
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
      helpGroupLabel: HELP_GROUPS.responseActions.label,
      helpGroupPosition: HELP_GROUPS.responseActions.position,
      helpCommandPosition: 2,
    },
    {
      name: 'processes',
      about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.processes.about', {
        defaultMessage: 'Display the processes on the endpoint',
      }),
      RenderComponent: GetProcessesActionResult,
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
            'xpack.securitySolution.endpointConsoleCommands.processes.arg.comment',
            { defaultMessage: 'A comment to go along with the action' }
          ),
        },
      },
      helpGroupLabel: HELP_GROUPS.responseActions.label,
      helpGroupPosition: HELP_GROUPS.responseActions.position,
      helpCommandPosition: 3,
    },
  ];
};
