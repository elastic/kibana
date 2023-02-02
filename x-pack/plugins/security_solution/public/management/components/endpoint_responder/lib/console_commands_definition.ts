/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ParsedArgData } from '../../console/service/types';
import { getUploadCommand } from './dev_only';
import { ExperimentalFeaturesService } from '../../../../common/experimental_features_service';
import type {
  EndpointCapabilities,
  ConsoleResponseActionCommands,
} from '../../../../../common/endpoint/service/response_actions/constants';
import { GetFileActionResult } from '../command_render_components/get_file_action';
import type { Command, CommandDefinition } from '../../console';
import { IsolateActionResult } from '../command_render_components/isolate_action';
import { ReleaseActionResult } from '../command_render_components/release_action';
import { KillProcessActionResult } from '../command_render_components/kill_process_action';
import { SuspendProcessActionResult } from '../command_render_components/suspend_process_action';
import { EndpointStatusActionResult } from '../command_render_components/status_action';
import { GetProcessesActionResult } from '../command_render_components/get_processes_action';
import type { EndpointPrivileges, ImmutableArray } from '../../../../../common/endpoint/types';
import {
  INSUFFICIENT_PRIVILEGES_FOR_COMMAND,
  UPGRADE_ENDPOINT_FOR_RESPONDER,
} from '../../../../common/translations';
import { getCommandAboutInfo } from './get_command_about_info';

const emptyArgumentValidator = (argData: ParsedArgData): true | string => {
  if (argData?.length > 0 && typeof argData[0] === 'string' && argData[0]?.trim().length > 0) {
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

const commandToCapabilitiesMap = new Map<ConsoleResponseActionCommands, EndpointCapabilities>([
  ['isolate', 'isolation'],
  ['release', 'isolation'],
  ['kill-process', 'kill_process'],
  ['suspend-process', 'suspend_process'],
  ['processes', 'running_processes'],
  ['get-file', 'get_file'],
]);

const getRbacControl = ({
  commandName,
  privileges,
}: {
  commandName: ConsoleResponseActionCommands;
  privileges: EndpointPrivileges;
}): boolean => {
  const commandToPrivilegeMap = new Map<ConsoleResponseActionCommands, boolean>([
    ['isolate', privileges.canIsolateHost],
    ['release', privileges.canUnIsolateHost],
    ['kill-process', privileges.canKillProcess],
    ['suspend-process', privileges.canSuspendProcess],
    ['processes', privileges.canGetRunningProcesses],
    ['get-file', privileges.canWriteFileOperations],
  ]);
  return commandToPrivilegeMap.get(commandName as ConsoleResponseActionCommands) ?? false;
};

const capabilitiesAndPrivilegesValidator = (command: Command): true | string => {
  const privileges = command.commandDefinition.meta.privileges;
  const endpointCapabilities: EndpointCapabilities[] = command.commandDefinition.meta.capabilities;
  const commandName = command.commandDefinition.name as ConsoleResponseActionCommands;
  const responderCapability = commandToCapabilitiesMap.get(commandName);
  let errorMessage = '';
  if (!responderCapability) {
    errorMessage = errorMessage.concat(UPGRADE_ENDPOINT_FOR_RESPONDER);
  }
  if (responderCapability) {
    if (!endpointCapabilities.includes(responderCapability)) {
      errorMessage = errorMessage.concat(UPGRADE_ENDPOINT_FOR_RESPONDER);
    }
  }
  if (getRbacControl({ commandName, privileges }) !== true) {
    errorMessage = errorMessage.concat(INSUFFICIENT_PRIVILEGES_FOR_COMMAND);
  }

  if (errorMessage.length) {
    return errorMessage;
  }

  return true;
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

export const getEndpointConsoleCommands = ({
  endpointAgentId,
  endpointCapabilities,
  endpointPrivileges,
}: {
  endpointAgentId: string;
  endpointCapabilities: ImmutableArray<string>;
  endpointPrivileges: EndpointPrivileges;
}): CommandDefinition[] => {
  const isGetFileEnabled = ExperimentalFeaturesService.get().responseActionGetFileEnabled;

  const doesEndpointSupportCommand = (commandName: ConsoleResponseActionCommands) => {
    const responderCapability = commandToCapabilitiesMap.get(commandName);
    if (responderCapability) {
      return endpointCapabilities.includes(responderCapability);
    }
    return false;
  };

  const consoleCommands: CommandDefinition[] = [
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
        privileges: endpointPrivileges,
      },
      exampleUsage: 'isolate --comment "isolate this host"',
      exampleInstruction: ENTER_OR_ADD_COMMENT_ARG_INSTRUCTION,
      validate: capabilitiesAndPrivilegesValidator,
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
      helpHidden: !getRbacControl({ commandName: 'isolate', privileges: endpointPrivileges }),
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
        privileges: endpointPrivileges,
      },
      exampleUsage: 'release --comment "release this host"',
      exampleInstruction: ENTER_OR_ADD_COMMENT_ARG_INSTRUCTION,
      validate: capabilitiesAndPrivilegesValidator,
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
      helpHidden: !getRbacControl({ commandName: 'release', privileges: endpointPrivileges }),
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
        privileges: endpointPrivileges,
      },
      exampleUsage: 'kill-process --pid 123 --comment "kill this process"',
      exampleInstruction: ENTER_PID_OR_ENTITY_ID_INSTRUCTION,
      validate: capabilitiesAndPrivilegesValidator,
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
      helpHidden: !getRbacControl({ commandName: 'kill-process', privileges: endpointPrivileges }),
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
        privileges: endpointPrivileges,
      },
      exampleUsage: 'suspend-process --pid 123 --comment "suspend this process"',
      exampleInstruction: ENTER_PID_OR_ENTITY_ID_INSTRUCTION,
      validate: capabilitiesAndPrivilegesValidator,
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
      helpHidden: !getRbacControl({
        commandName: 'suspend-process',
        privileges: endpointPrivileges,
      }),
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
        privileges: endpointPrivileges,
      },
      exampleUsage: 'processes --comment "get the processes"',
      exampleInstruction: ENTER_OR_ADD_COMMENT_ARG_INSTRUCTION,
      validate: capabilitiesAndPrivilegesValidator,
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
      helpHidden: !getRbacControl({ commandName: 'processes', privileges: endpointPrivileges }),
    },
  ];

  // FIXME: DELETE PRIOR TO MERGE
  // for dev purposes only - command only shown if url has `show_upload=`
  if (location.search.includes('show_upload=')) {
    consoleCommands.push(
      getUploadCommand({ endpointAgentId, endpointPrivileges, endpointCapabilities })
    );
  }

  // `get-file` is currently behind feature flag
  if (isGetFileEnabled) {
    consoleCommands.push({
      name: 'get-file',
      about: getCommandAboutInfo({
        aboutInfo: i18n.translate('xpack.securitySolution.endpointConsoleCommands.getFile.about', {
          defaultMessage: 'Retrieve a file from the host',
        }),
        isSupported: doesEndpointSupportCommand('processes'),
      }),
      RenderComponent: GetFileActionResult,
      meta: {
        endpointId: endpointAgentId,
        capabilities: endpointCapabilities,
        privileges: endpointPrivileges,
      },
      exampleUsage: 'get-file --path "/full/path/to/file.txt" --comment "Possible malware"',
      exampleInstruction: ENTER_OR_ADD_COMMENT_ARG_INSTRUCTION,
      validate: capabilitiesAndPrivilegesValidator,
      mustHaveArgs: true,
      args: {
        path: {
          required: true,
          allowMultiples: false,
          about: i18n.translate(
            'xpack.securitySolution.endpointConsoleCommands.getFile.pathArgAbout',
            {
              defaultMessage: 'The full file path to be retrieved',
            }
          ),
          validate: (argData) => {
            return emptyArgumentValidator(argData);
          },
        },
        comment: {
          required: false,
          allowMultiples: false,
          about: COMMENT_ARG_ABOUT,
        },
      },
      helpGroupLabel: HELP_GROUPS.responseActions.label,
      helpGroupPosition: HELP_GROUPS.responseActions.position,
      helpCommandPosition: 6,
      helpDisabled: !doesEndpointSupportCommand('get-file'),
      helpHidden: !getRbacControl({
        commandName: 'get-file',
        privileges: endpointPrivileges,
      }),
    });
  }

  return consoleCommands;
};
