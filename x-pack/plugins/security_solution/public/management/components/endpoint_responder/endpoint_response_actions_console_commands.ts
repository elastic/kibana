/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Command, CommandDefinition } from '../console';
import { IsolateActionResult } from './isolate_action';
import { ReleaseActionResult } from './release_action';
import { KillProcessActionResult } from './kill_process_action';
import { SuspendProcessActionResult } from './suspend_process_action';
import { EndpointStatusActionResult } from './status_action';
import { GetProcessesActionResult } from './get_processes_action';
import type { ParsedArgData } from '../console/service/parsed_command_input';
import type { ImmutableArray } from '../../../../common/endpoint/types';
import { UPGRADE_ENDPOINT_FOR_RESPONDER } from '../../../common/translations';
import type {
  ResponderCapabilities,
  ResponderCommands,
} from '../../../../common/endpoint/constants';

const emptyArgumentValidator = (argData: ParsedArgData): true | string => {
  if (argData?.length > 0 && argData[0]?.trim().length > 0) {
    return true;
  } else {
    return i18n.translate('xpack.securitySolution.endpointConsoleCommands.emptyArgumentMessage', {
      defaultMessage: 'Argument cannot be empty',
    });
  }
};

const pidValidator = (argData: ParsedArgData): true | string => {
  const emptyResult = emptyArgumentValidator(argData);
  if (emptyResult !== true) {
    return emptyResult;
  } else if (Number.isSafeInteger(Number(argData)) && Number(argData) > 0) {
    return true;
  } else {
    return i18n.translate('xpack.securitySolution.endpointConsoleCommands.invalidPidMessage', {
      defaultMessage: 'Argument must be a positive number representing the PID of a process',
    });
  }
};

const commandToCapabilitiesMap = new Map<ResponderCommands, ResponderCapabilities>([
  ['isolate', 'isolation'],
  ['release', 'isolation'],
  ['kill-process', 'kill_process'],
  ['suspend-process', 'suspend_process'],
  ['processes', 'running_processes'],
]);

const capabilitiesValidator = (command: Command): true | string => {
  const endpointCapabilities = command.commandDefinition.meta.capabilities;
  const responderCapability = command.commandDefinition.name;
  if (endpointCapabilities.includes(commandToCapabilitiesMap.get(responderCapability)) === true) {
    return true;
  }

  return UPGRADE_ENDPOINT_FOR_RESPONDER;
};

const HELP_GROUPS = Object.freeze({
  responseActions: {
    position: 0,
    label: i18n.translate('xpack.securitySolution.endpointConsoleCommands.groups.responseActions', {
      defaultMessage: 'Response actions',
    }),
  },
});

const ENTER_PID_OR_ENTITY_ID_INSTRUCTION = i18n.translate(
  'xpack.securitySolution.endpointResponseActionsConsoleCommands.enterPidOrEntityId',
  { defaultMessage: 'Enter a pid or an entity id to execute' }
);

const ENTER_OR_ADD_COMMENT_ARG_INSTRUCTION = i18n.translate(
  'xpack.securitySolution.endpointResponseActionsConsoleCommands.enterOrAddOptionalComment',
  { defaultMessage: 'Hit enter to execute or add an optional comment' }
);

const COMMENT_ARG_ABOUT = i18n.translate(
  'xpack.securitySolution.endpointConsoleCommands.suspendProcess.commandArgAbout',
  { defaultMessage: 'A comment to go along with the action' }
);

const DISABLED_COMMAND_ABOUT = i18n.translate(
  'xpack.securitySolution.endpointConsoleCommands.suspendProcess.disabledCommandAbout',
  { defaultMessage: 'This endpoint does not support this commmand' }
);

export const getEndpointResponseActionsConsoleCommands = ({
  endpointAgentId,
  endpointCapabilities,
}: {
  endpointAgentId: string;
  endpointCapabilities: ImmutableArray<string>;
}): CommandDefinition[] => {
  return [
    {
      name: 'isolate',
      about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.isolate.about', {
        defaultMessage: 'Isolate the host',
      }),
      RenderComponent: IsolateActionResult,
      meta: {
        endpointId: endpointAgentId,
        capabilities: endpointCapabilities,
      },
      exampleUsage: 'isolate --comment "isolate this host"',
      exampleInstruction: ENTER_OR_ADD_COMMENT_ARG_INSTRUCTION,
      validate: capabilitiesValidator,
      args: {
        comment: {
          required: false,
          allowMultiples: false,
          about: COMMENT_ARG_ABOUT,
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
        capabilities: endpointCapabilities,
      },
      exampleUsage: 'release --comment "release this host"',
      exampleInstruction: ENTER_OR_ADD_COMMENT_ARG_INSTRUCTION,
      validate: capabilitiesValidator,
      args: {
        comment: {
          required: false,
          allowMultiples: false,
          about: COMMENT_ARG_ABOUT,
        },
      },
      helpGroupLabel: HELP_GROUPS.responseActions.label,
      helpGroupPosition: HELP_GROUPS.responseActions.position,
      helpCommandPosition: 1,
    },
    {
      name: 'kill-process',
      about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.killProcess.about', {
        defaultMessage: 'Kill/terminate a process',
      }),
      RenderComponent: KillProcessActionResult,
      meta: {
        endpointId: endpointAgentId,
        capabilities: endpointCapabilities,
      },
      exampleUsage: 'kill-process --pid 123 --comment "kill this process"',
      exampleInstruction: ENTER_PID_OR_ENTITY_ID_INSTRUCTION,
      validate: capabilitiesValidator,
      mustHaveArgs: true,
      args: {
        comment: {
          required: false,
          allowMultiples: false,
          about: COMMENT_ARG_ABOUT,
        },
        pid: {
          required: false,
          allowMultiples: false,
          exclusiveOr: true,
          about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.pid.arg.comment', {
            defaultMessage: 'A PID representing the process to kill',
          }),
          validate: pidValidator,
        },
        entityId: {
          required: false,
          allowMultiples: false,
          exclusiveOr: true,
          about: i18n.translate(
            'xpack.securitySolution.endpointConsoleCommands.entityId.arg.comment',
            {
              defaultMessage: 'An entity id representing the process to kill',
            }
          ),
          validate: emptyArgumentValidator,
        },
      },
      helpGroupLabel: HELP_GROUPS.responseActions.label,
      helpGroupPosition: HELP_GROUPS.responseActions.position,
      helpCommandPosition: 4,
      helpDisabled: true,
    },
    {
      name: 'suspend-process',
      about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.suspendProcess.about', {
        defaultMessage: 'Temporarily suspend a process',
      }),
      RenderComponent: SuspendProcessActionResult,
      meta: {
        endpointId: endpointAgentId,
        capabilities: endpointCapabilities,
      },
      exampleUsage: 'suspend-process --pid 123 --comment "suspend this process"',
      exampleInstruction: ENTER_PID_OR_ENTITY_ID_INSTRUCTION,
      validate: capabilitiesValidator,
      mustHaveArgs: true,
      args: {
        comment: {
          required: false,
          allowMultiples: false,
          about: COMMENT_ARG_ABOUT,
        },
        pid: {
          required: false,
          allowMultiples: false,
          exclusiveOr: true,
          about: i18n.translate(
            'xpack.securitySolution.endpointConsoleCommands.suspendProcess.pid.arg.comment',
            {
              defaultMessage: 'A PID representing the process to suspend',
            }
          ),
          validate: pidValidator,
        },
        entityId: {
          required: false,
          allowMultiples: false,
          exclusiveOr: true,
          about: i18n.translate(
            'xpack.securitySolution.endpointConsoleCommands.suspendProcess.entityId.arg.comment',
            {
              defaultMessage: 'An entity id representing the process to suspend',
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
        defaultMessage: 'Show host status information',
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
        defaultMessage: 'Show all running processes',
      }),
      RenderComponent: GetProcessesActionResult,
      meta: {
        endpointId: endpointAgentId,
        capabilities: endpointCapabilities,
      },
      exampleUsage: 'processes --comment "get the processes"',
      exampleInstruction: ENTER_OR_ADD_COMMENT_ARG_INSTRUCTION,
      validate: capabilitiesValidator,
      args: {
        comment: {
          required: false,
          allowMultiples: false,
          about: COMMENT_ARG_ABOUT,
        },
      },
      helpGroupLabel: HELP_GROUPS.responseActions.label,
      helpGroupPosition: HELP_GROUPS.responseActions.position,
      helpCommandPosition: 3,
    },
  ];
};
