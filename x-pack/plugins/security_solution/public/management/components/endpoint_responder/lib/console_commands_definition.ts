/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isActionSupportedByAgentType } from '../../../../../common/endpoint/service/response_actions/is_response_action_supported';
import { getRbacControl } from '../../../../../common/endpoint/service/response_actions/utils';
import { UploadActionResult } from '../command_render_components/upload_action';
import { ArgumentFileSelector } from '../../console_argument_selectors';
import type { ParsedArgData } from '../../console/service/types';
import { ExperimentalFeaturesService } from '../../../../common/experimental_features_service';
import type {
  ConsoleResponseActionCommands,
  EndpointCapabilities,
  ResponseActionAgentType,
} from '../../../../../common/endpoint/service/response_actions/constants';
import {
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_ENDPOINT_CAPABILITY,
  RESPONSE_CONSOLE_COMMAND_TO_API_COMMAND_MAP,
} from '../../../../../common/endpoint/service/response_actions/constants';
import { GetFileActionResult } from '../command_render_components/get_file_action';
import type { Command, CommandDefinition } from '../../console';
import { IsolateActionResult } from '../command_render_components/isolate_action';
import { ReleaseActionResult } from '../command_render_components/release_action';
import { KillProcessActionResult } from '../command_render_components/kill_process_action';
import { SuspendProcessActionResult } from '../command_render_components/suspend_process_action';
import { EndpointStatusActionResult } from '../command_render_components/status_action';
import { GetProcessesActionResult } from '../command_render_components/get_processes_action';
import {
  ExecuteActionResult,
  getExecuteCommandArgAboutInfo,
} from '../command_render_components/execute_action';
import type { EndpointPrivileges, ImmutableArray } from '../../../../../common/endpoint/types';
import {
  INSUFFICIENT_PRIVILEGES_FOR_COMMAND,
  UPGRADE_AGENT_FOR_RESPONDER,
} from '../../../../common/translations';
import { getCommandAboutInfo } from './get_command_about_info';

import { validateUnitOfTime } from './utils';
import { CONSOLE_COMMANDS } from '../../../common/translations';
import { ScanActionResult } from '../command_render_components/scan_action';

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

const executeTimeoutValidator = (argData: ParsedArgData): true | string => {
  if (String(argData).trim().length && validateUnitOfTime(String(argData).trim())) {
    return true;
  } else {
    return i18n.translate('xpack.securitySolution.endpointConsoleCommands.invalidExecuteTimeout', {
      defaultMessage:
        'Argument must be a string with a positive integer value followed by a unit of time (h for hours, m for minutes, s for seconds). Example: 37m.',
    });
  }
};

const capabilitiesAndPrivilegesValidator = (
  agentType: ResponseActionAgentType
): ((command: Command) => string | true) => {
  return (command: Command) => {
    const privileges = command.commandDefinition.meta.privileges;
    const agentCapabilities: EndpointCapabilities[] = command.commandDefinition.meta.capabilities;
    const commandName = command.commandDefinition.name as ConsoleResponseActionCommands;
    const responderCapability =
      RESPONSE_CONSOLE_ACTION_COMMANDS_TO_ENDPOINT_CAPABILITY[commandName];
    let errorMessage = '';

    // We only validate Agent capabilities for the command for Endpoint agents
    if (agentType === 'endpoint') {
      if (!responderCapability) {
        errorMessage = errorMessage.concat(UPGRADE_AGENT_FOR_RESPONDER(agentType, commandName));
      }

      if (responderCapability && !agentCapabilities.includes(responderCapability)) {
        errorMessage = errorMessage.concat(UPGRADE_AGENT_FOR_RESPONDER(agentType, commandName));
      }
    }

    if (!getRbacControl({ commandName, privileges })) {
      errorMessage = errorMessage.concat(INSUFFICIENT_PRIVILEGES_FOR_COMMAND);
    }

    if (errorMessage.length) {
      return errorMessage;
    }

    return true;
  };
};

export const HELP_GROUPS = Object.freeze({
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

export interface GetEndpointConsoleCommandsOptions {
  endpointAgentId: string;
  agentType: ResponseActionAgentType;
  endpointCapabilities: ImmutableArray<string>;
  endpointPrivileges: EndpointPrivileges;
}

export const getEndpointConsoleCommands = ({
  endpointAgentId,
  agentType,
  endpointCapabilities,
  endpointPrivileges,
}: GetEndpointConsoleCommandsOptions): CommandDefinition[] => {
  const featureFlags = ExperimentalFeaturesService.get();

  const isUploadEnabled = featureFlags.responseActionUploadEnabled;
  const isScanEnabled = featureFlags.responseActionScanEnabled;

  const doesEndpointSupportCommand = (commandName: ConsoleResponseActionCommands) => {
    // Agent capabilities is only validated for Endpoint agent types
    if (agentType !== 'endpoint') {
      return true;
    }

    const responderCapability =
      RESPONSE_CONSOLE_ACTION_COMMANDS_TO_ENDPOINT_CAPABILITY[commandName];

    if (responderCapability) {
      return endpointCapabilities.includes(responderCapability);
    }

    return false;
  };

  const consoleCommands: CommandDefinition[] = [
    {
      name: 'isolate',
      about: getCommandAboutInfo({
        aboutInfo: CONSOLE_COMMANDS.isolate.about,
        isSupported: doesEndpointSupportCommand('isolate'),
      }),
      RenderComponent: IsolateActionResult,
      meta: {
        agentType,
        endpointId: endpointAgentId,
        capabilities: endpointCapabilities,
        privileges: endpointPrivileges,
      },
      exampleUsage: 'isolate --comment "isolate this host"',
      exampleInstruction: ENTER_OR_ADD_COMMENT_ARG_INSTRUCTION,
      validate: capabilitiesAndPrivilegesValidator(agentType),
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
        aboutInfo: CONSOLE_COMMANDS.release.about,

        isSupported: doesEndpointSupportCommand('release'),
      }),
      RenderComponent: ReleaseActionResult,
      meta: {
        agentType,
        endpointId: endpointAgentId,
        capabilities: endpointCapabilities,
        privileges: endpointPrivileges,
      },
      exampleUsage: 'release --comment "release this host"',
      exampleInstruction: ENTER_OR_ADD_COMMENT_ARG_INSTRUCTION,
      validate: capabilitiesAndPrivilegesValidator(agentType),
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
      //
      name: 'kill-process',
      about: getCommandAboutInfo({
        aboutInfo: CONSOLE_COMMANDS.killProcess.about,
        isSupported: doesEndpointSupportCommand('kill-process'),
      }),
      RenderComponent: KillProcessActionResult,
      meta: {
        agentType,
        endpointId: endpointAgentId,
        capabilities: endpointCapabilities,
        privileges: endpointPrivileges,
      },
      exampleUsage: 'kill-process --pid 123 --comment "kill this process"',
      exampleInstruction: ENTER_PID_OR_ENTITY_ID_INSTRUCTION,
      validate: capabilitiesAndPrivilegesValidator(agentType),
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
          about: CONSOLE_COMMANDS.killProcess.args.pid.about,
          validate: pidValidator,
        },
        entityId: {
          required: false,
          allowMultiples: false,
          exclusiveOr: true,
          about: CONSOLE_COMMANDS.killProcess.args.entityId.about,
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
        aboutInfo: CONSOLE_COMMANDS.suspendProcess.about,
        isSupported: doesEndpointSupportCommand('suspend-process'),
      }),
      RenderComponent: SuspendProcessActionResult,
      meta: {
        agentType,
        endpointId: endpointAgentId,
        capabilities: endpointCapabilities,
        privileges: endpointPrivileges,
      },
      exampleUsage: 'suspend-process --pid 123 --comment "suspend this process"',
      exampleInstruction: ENTER_PID_OR_ENTITY_ID_INSTRUCTION,
      validate: capabilitiesAndPrivilegesValidator(agentType),
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
          about: CONSOLE_COMMANDS.suspendProcess.args.pid.about,
          validate: pidValidator,
        },
        entityId: {
          required: false,
          allowMultiples: false,
          exclusiveOr: true,
          about: CONSOLE_COMMANDS.suspendProcess.args.entityId.about,
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
      about: CONSOLE_COMMANDS.status.about,
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
        aboutInfo: CONSOLE_COMMANDS.processes.about,
        isSupported: doesEndpointSupportCommand('processes'),
      }),
      RenderComponent: GetProcessesActionResult,
      meta: {
        agentType,
        endpointId: endpointAgentId,
        capabilities: endpointCapabilities,
        privileges: endpointPrivileges,
      },
      exampleUsage: 'processes --comment "get the processes"',
      exampleInstruction: ENTER_OR_ADD_COMMENT_ARG_INSTRUCTION,
      validate: capabilitiesAndPrivilegesValidator(agentType),
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
    {
      name: 'get-file',
      about: getCommandAboutInfo({
        aboutInfo: CONSOLE_COMMANDS.getFile.about,
        isSupported: doesEndpointSupportCommand('get-file'),
      }),
      RenderComponent: GetFileActionResult,
      meta: {
        agentType,
        endpointId: endpointAgentId,
        capabilities: endpointCapabilities,
        privileges: endpointPrivileges,
      },
      exampleUsage: 'get-file --path "/full/path/to/file.txt" --comment "Possible malware"',
      exampleInstruction: ENTER_OR_ADD_COMMENT_ARG_INSTRUCTION,
      validate: capabilitiesAndPrivilegesValidator(agentType),
      mustHaveArgs: true,
      args: {
        path: {
          required: true,
          allowMultiples: false,
          about: CONSOLE_COMMANDS.getFile.args.path.about,
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
    },
    {
      name: 'execute',
      about: getCommandAboutInfo({
        aboutInfo: CONSOLE_COMMANDS.execute.about,
        isSupported: doesEndpointSupportCommand('execute'),
      }),
      RenderComponent: ExecuteActionResult,
      meta: {
        agentType,
        endpointId: endpointAgentId,
        capabilities: endpointCapabilities,
        privileges: endpointPrivileges,
      },
      exampleUsage: 'execute --command "ls -al" --timeout 2s --comment "Get list of all files"',
      exampleInstruction: ENTER_OR_ADD_COMMENT_ARG_INSTRUCTION,
      validate: capabilitiesAndPrivilegesValidator(agentType),
      mustHaveArgs: true,
      args: {
        command: {
          required: true,
          allowMultiples: false,
          about: getExecuteCommandArgAboutInfo(),
          mustHaveValue: 'non-empty-string',
        },
        timeout: {
          required: false,
          allowMultiples: false,
          about: CONSOLE_COMMANDS.execute.args.timeout.about,
          mustHaveValue: 'non-empty-string',
          validate: executeTimeoutValidator,
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
      helpDisabled: !doesEndpointSupportCommand('execute'),
      helpHidden: !getRbacControl({
        commandName: 'execute',
        privileges: endpointPrivileges,
      }),
    },
  ];

  // `upload` command
  // planned for 8.9
  if (isUploadEnabled) {
    consoleCommands.push({
      name: 'upload',
      about: getCommandAboutInfo({
        aboutInfo: CONSOLE_COMMANDS.upload.about,
        isSupported: doesEndpointSupportCommand('upload'),
      }),
      RenderComponent: UploadActionResult,
      meta: {
        agentType,
        endpointId: endpointAgentId,
        capabilities: endpointCapabilities,
        privileges: endpointPrivileges,
      },
      exampleUsage: 'upload --file --overwrite --comment "script to fix registry"',
      exampleInstruction: ENTER_OR_ADD_COMMENT_ARG_INSTRUCTION,
      validate: capabilitiesAndPrivilegesValidator(agentType),
      mustHaveArgs: true,
      args: {
        file: {
          required: true,
          allowMultiples: false,
          about: CONSOLE_COMMANDS.upload.args.file.about,
          mustHaveValue: 'truthy',
          SelectorComponent: ArgumentFileSelector,
        },
        overwrite: {
          required: false,
          allowMultiples: false,
          about: CONSOLE_COMMANDS.upload.args.overwrite.about,
          mustHaveValue: false,
        },
        comment: {
          required: false,
          allowMultiples: false,
          mustHaveValue: 'non-empty-string',
          about: COMMENT_ARG_ABOUT,
        },
      },
      helpGroupLabel: HELP_GROUPS.responseActions.label,
      helpGroupPosition: HELP_GROUPS.responseActions.position,
      helpCommandPosition: 7,
      helpDisabled: !doesEndpointSupportCommand('upload'),
      helpHidden: !getRbacControl({
        commandName: 'upload',
        privileges: endpointPrivileges,
      }),
    });
  }

  if (isScanEnabled) {
    consoleCommands.push({
      name: 'scan',
      about: getCommandAboutInfo({
        aboutInfo: CONSOLE_COMMANDS.scan.about,
        isSupported: doesEndpointSupportCommand('scan'),
      }),
      RenderComponent: ScanActionResult,
      meta: {
        agentType,
        endpointId: endpointAgentId,
        capabilities: endpointCapabilities,
        privileges: endpointPrivileges,
      },
      exampleUsage: 'scan --path "/full/path/to/folder" --comment "Scan folder for malware"',
      exampleInstruction: ENTER_OR_ADD_COMMENT_ARG_INSTRUCTION,
      validate: capabilitiesAndPrivilegesValidator(agentType),
      mustHaveArgs: true,
      args: {
        path: {
          required: true,
          allowMultiples: false,
          mustHaveValue: 'non-empty-string',
          about: CONSOLE_COMMANDS.scan.args.path.about,
        },
        comment: {
          required: false,
          allowMultiples: false,
          about: COMMENT_ARG_ABOUT,
        },
      },
      helpGroupLabel: HELP_GROUPS.responseActions.label,
      helpGroupPosition: HELP_GROUPS.responseActions.position,
      helpCommandPosition: 8,
      helpDisabled: !doesEndpointSupportCommand('scan'),
      helpHidden: !getRbacControl({
        commandName: 'scan',
        privileges: endpointPrivileges,
      }),
    });
  }

  switch (agentType) {
    case 'sentinel_one':
      return adjustCommandsForSentinelOne({ commandList: consoleCommands });
    case 'crowdstrike':
      return adjustCommandsForCrowdstrike({ commandList: consoleCommands });
    default:
      // agentType === endpoint: just returns the defined command list
      return consoleCommands;
  }
};

/** @private */
const adjustCommandsForSentinelOne = ({
  commandList,
}: {
  commandList: CommandDefinition[];
}): CommandDefinition[] => {
  const featureFlags = ExperimentalFeaturesService.get();
  const isHostIsolationEnabled = featureFlags.responseActionsSentinelOneV1Enabled;
  const isGetFileFeatureEnabled = featureFlags.responseActionsSentinelOneGetFileEnabled;

  const disableCommand = (command: CommandDefinition) => {
    command.helpDisabled = true;
    command.helpHidden = true;
    command.validate = () =>
      UPGRADE_AGENT_FOR_RESPONDER('sentinel_one', command.name as ConsoleResponseActionCommands);
  };

  return commandList.map((command) => {
    const agentSupportsResponseAction =
      command.name === 'status'
        ? false
        : isActionSupportedByAgentType(
            'sentinel_one',
            RESPONSE_CONSOLE_COMMAND_TO_API_COMMAND_MAP[
              command.name as ConsoleResponseActionCommands
            ],
            'manual'
          );

    // If command is not supported by SentinelOne - disable it
    if (
      !agentSupportsResponseAction ||
      (command.name === 'get-file' && !isGetFileFeatureEnabled) ||
      (command.name === 'isolate' && !isHostIsolationEnabled) ||
      (command.name === 'release' && !isHostIsolationEnabled)
    ) {
      disableCommand(command);
    }

    return command;
  });
};

/** @private */
const adjustCommandsForCrowdstrike = ({
  commandList,
}: {
  commandList: CommandDefinition[];
}): CommandDefinition[] => {
  const featureFlags = ExperimentalFeaturesService.get();
  const isHostIsolationEnabled = featureFlags.responseActionsCrowdstrikeManualHostIsolationEnabled;

  const disableCommand = (command: CommandDefinition) => {
    command.helpDisabled = true;
    command.helpHidden = true;
    command.validate = () =>
      UPGRADE_AGENT_FOR_RESPONDER('crowdstrike', command.name as ConsoleResponseActionCommands);
  };

  return commandList.map((command) => {
    const agentSupportsResponseAction =
      command.name === 'status'
        ? false
        : isActionSupportedByAgentType(
            'crowdstrike',
            RESPONSE_CONSOLE_COMMAND_TO_API_COMMAND_MAP[
              command.name as ConsoleResponseActionCommands
            ],
            'manual'
          );

    // If command is not supported by Crowdstrike - disable it
    if (
      !agentSupportsResponseAction ||
      (command.name === 'isolate' && !isHostIsolationEnabled) ||
      (command.name === 'release' && !isHostIsolationEnabled)
    ) {
      disableCommand(command);
    }

    return command;
  });
};
