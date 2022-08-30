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
import { getCommandAboutInfo } from './get_command_about_info';

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
  const endpointCapabilities: ResponderCapabilities[] = command.commandDefinition.meta.capabilities;
  const responderCapability = commandToCapabilitiesMap.get(
    command.commandDefinition.name as ResponderCommands
  );
  if (responderCapability) {
    if (endpointCapabilities.includes(responderCapability)) {
      return true;
    }
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

export const getEndpointResponseActionsConsoleCommands = ({
  endpointAgentId,
  endpointCapabilities,
}: {
  endpointAgentId: string;
  endpointCapabilities: ImmutableArray<string>;
}): CommandDefinition[] => {
  const doesEndpointSupportCommand = (commandName: ResponderCommands) => {
    const responderCapability = commandToCapabilitiesMap.get(commandName);
    if (responderCapability) {
      return endpointCapabilities.includes(responderCapability);
    }
    return false;
  };
  return [
    {
      name: 'isolate',
      about: getCommandAboutInfo({
        aboutInfo: i18n.translate('xpack.securitySolution.endpointConsoleCommands.isolate.about', {
          defaultMessage: 'Isolate the host',
        }),
        isSupported: doesEndpointSupportCommand('isolate'),
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
      helpDisabled: doesEndpointSupportCommand('isolate') === false,
    },
    {
      name: 'release',
      about: getCommandAboutInfo({
        aboutInfo: i18n.translate('xpack.securitySolution.endpointConsoleCommands.release.about', {
          defaultMessage: 'Release the host',
        }),
        isSupported: doesEndpointSupportCommand('release'),
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
      helpDisabled: doesEndpointSupportCommand('release') === false,
    },
    {
      name: 'kill-process',
      about: getCommandAboutInfo({
        aboutInfo: i18n.translate(
          'xpack.securitySolution.endpointConsoleCommands.killProcess.about',
          {
            defaultMessage: 'Kill/terminate a process',
          }
        ),
        isSupported: doesEndpointSupportCommand('kill-process'),
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
      helpDisabled: doesEndpointSupportCommand('kill-process') === false,
    },
    {
      name: 'suspend-process',
      about: getCommandAboutInfo({
        aboutInfo: i18n.translate(
          'xpack.securitySolution.endpointConsoleCommands.suspendProcess.about',
          {
            defaultMessage: 'Temporarily suspend a process',
          }
        ),
        isSupported: doesEndpointSupportCommand('suspend-process'),
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
      helpDisabled: doesEndpointSupportCommand('suspend-process') === false,
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
      about: getCommandAboutInfo({
        aboutInfo: i18n.translate(
          'xpack.securitySolution.endpointConsoleCommands.processes.about',
          {
            defaultMessage: 'Show all running processes',
          }
        ),
        isSupported: doesEndpointSupportCommand('processes'),
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
      helpDisabled: doesEndpointSupportCommand('processes') === false,
    },
  ];
};
