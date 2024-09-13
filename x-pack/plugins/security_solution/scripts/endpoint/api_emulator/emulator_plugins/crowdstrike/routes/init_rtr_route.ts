/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CrowdstrikeHostActionsParams } from '@kbn/stack-connectors-plugin/common/crowdstrike/types';
import { buildCrowdstrikeRoutePath, TEST_AGENT_ID, TEST_SESSION_ID } from './utils';
import type { ExternalEdrServerEmulatorRouteHandlerMethod } from '../../../external_edr_server_emulator.types';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';

export const initRTRSessionRoute = (): EmulatorServerRouteDefinition => {
  return {
    path: buildCrowdstrikeRoutePath('/real-time-response/entities/sessions/v1'),
    method: 'POST',
    handler: initRTRSessionHandler,
  };
};
// requestBody:
// {
//   "device_id": "xxxxxx",
//   "queue_offline": false
// }

// @ts-expect-error - example of invalid agent id error
const initRTRSessionInvalidAgentIdError = async () => {
  return {
    meta: {
      query_time: 0.244284399,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    batch_id: '',
    resources: {
      [TEST_AGENT_ID]: {
        session_id: '',
        complete: false,
        stdout: '',
        stderr: '',
        aid: TEST_AGENT_ID,
        errors: [
          {
            code: 500,
            message: 'uuid: incorrect UUID length 47 in string "wrongAgentId"',
          },
        ],
        query_time: 0,
        offline_queued: false,
      },
    },
    errors: [
      {
        code: 404,
        message: 'no successful hosts initialized on RTR',
      },
    ],
  };
};

// @ts-expect-error - example of missing agent id error
const initRTRSessionMissingAgentIdError = async () => {
  return {
    meta: {
      query_time: 0.00034664,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    batch_id: '',
    resources: {},
    errors: [
      {
        code: 400,
        message:
          'Invalid number of hosts in request: 0. Must be an integer greater than 0 and less than or equal to 10000',
      },
    ],
  };
};

const initRTRSessionHandler: ExternalEdrServerEmulatorRouteHandlerMethod<
  {},
  CrowdstrikeHostActionsParams
> = async () => {
  return {
    meta: {
      query_time: 1.776937422,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    resources: [
      {
        session_id: TEST_SESSION_ID,
        scripts: [
          {
            command: 'cat',
            description: 'Read a file from disk and display as ASCII',
            examples: 'cat foo.txt\r\ncat -n foo.txt\r\ncat -t foo.txt\r\ncat -t -n foo.txt',
            internal_only: false,
            runnable: true,
            sub_commands: [],
            args: [
              {
                id: 671,
                created_at: '2020-09-22T00:54:20Z',
                updated_at: '2020-09-22T00:54:20Z',
                script_id: 94,
                arg_type: 'arg',
                data_type: 'string',
                requires_value: false,
                arg_name: 'Path',
                description: 'path to cat',
                default_value: '',
                required: true,
                sequence: 1,
                options: null,
                encoding: '',
                command_level: 'non-destructive',
              },
              {
                id: 672,
                created_at: '2020-09-22T00:54:20Z',
                updated_at: '2020-09-22T00:54:20Z',
                script_id: 94,
                arg_type: 'flag',
                data_type: 'string',
                requires_value: false,
                arg_name: 'n',
                description: 'Number the output lines starting from 1',
                default_value: '',
                required: false,
                sequence: 2,
                options: null,
                encoding: '',
                command_level: 'non-destructive',
              },
              {
                id: 673,
                created_at: '2020-09-22T00:54:20Z',
                updated_at: '2020-09-22T00:54:20Z',
                script_id: 94,
                arg_type: 'flag',
                data_type: 'string',
                requires_value: false,
                arg_name: 't',
                description: "Display non-printing characters, and display tab characters as `^I'.",
                default_value: '',
                required: false,
                sequence: 3,
                options: null,
                encoding: '',
                command_level: 'non-destructive',
              },
            ],
          },
          {
            command: 'cd',
            description: 'Change the current working directory',
            examples: '',
            internal_only: false,
            runnable: true,
            sub_commands: [],
            args: [
              {
                id: 674,
                created_at: '2020-09-22T00:54:07Z',
                updated_at: '2020-09-22T00:54:07Z',
                script_id: 95,
                arg_type: 'arg',
                data_type: 'string',
                requires_value: false,
                arg_name: 'Path',
                description: 'path',
                default_value: '',
                required: true,
                sequence: 1,
                options: null,
                encoding: '',
                command_level: 'non-destructive',
              },
            ],
          },
          {
            command: 'env',
            description: 'Print out the environment',
            examples: 'env',
            internal_only: false,
            runnable: true,
            sub_commands: [],
            args: [],
          },
          {
            command: 'filehash',
            description: 'Generate the MD5, SHA1, and SHA256 hashes of a file',
            examples: 'filehash /tmp/test',
            internal_only: false,
            runnable: true,
            sub_commands: [],
            args: [
              {
                id: 680,
                created_at: '2020-09-22T00:53:36Z',
                updated_at: '2020-09-22T00:53:36Z',
                script_id: 100,
                arg_type: 'arg',
                data_type: 'string',
                requires_value: false,
                arg_name: 'Path',
                description: 'File to hash',
                default_value: '',
                required: true,
                sequence: 1,
                options: null,
                encoding: '',
                command_level: 'non-destructive',
              },
            ],
          },
          {
            command: 'ifconfig',
            description: 'Show network configuration information',
            examples: 'ifconfig',
            internal_only: false,
            runnable: true,
            sub_commands: [],
            args: [],
          },
          {
            command: 'ls',
            description: 'Display the contents of the specified path',
            examples:
              'ls\r\nls -l\r\nls -L\r\nls -t\r\nls -l -@\r\nls -R\r\nls -l -R\r\nls -l -t -R -L',
            internal_only: false,
            runnable: true,
            sub_commands: [],
            args: [
              {
                id: 684,
                created_at: '2020-09-22T00:53:14Z',
                updated_at: '2020-09-22T00:53:14Z',
                script_id: 104,
                arg_type: 'arg',
                data_type: 'string',
                requires_value: false,
                arg_name: 'Path',
                description: 'Path',
                default_value: '.',
                required: false,
                sequence: 1,
                options: null,
                encoding: '',
                command_level: 'non-destructive',
              },
              {
                id: 685,
                created_at: '2020-09-22T00:53:14Z',
                updated_at: '2020-09-22T00:53:14Z',
                script_id: 104,
                arg_type: 'flag',
                data_type: 'string',
                requires_value: false,
                arg_name: 'l',
                description: 'List in long format.',
                default_value: '',
                required: false,
                sequence: 2,
                options: null,
                encoding: '',
                command_level: 'non-destructive',
              },
              {
                id: 686,
                created_at: '2020-09-22T00:53:14Z',
                updated_at: '2020-09-22T00:53:14Z',
                script_id: 104,
                arg_type: 'flag',
                data_type: 'string',
                requires_value: false,
                arg_name: 'L',
                description:
                  'Follow all symbolic links to final target and list the file or directory the link references rather than the link itself.',
                default_value: '',
                required: false,
                sequence: 3,
                options: null,
                encoding: '',
                command_level: 'non-destructive',
              },
              {
                id: 687,
                created_at: '2020-09-22T00:53:14Z',
                updated_at: '2020-09-22T00:53:14Z',
                script_id: 104,
                arg_type: 'flag',
                data_type: 'string',
                requires_value: false,
                arg_name: 'R',
                description: 'Recursively list subdirectories encountered.',
                default_value: '',
                required: false,
                sequence: 4,
                options: null,
                encoding: '',
                command_level: 'non-destructive',
              },
              {
                id: 688,
                created_at: '2020-09-22T00:53:14Z',
                updated_at: '2020-09-22T00:53:14Z',
                script_id: 104,
                arg_type: 'flag',
                data_type: 'string',
                requires_value: false,
                arg_name: 't',
                description:
                  'Sort by time modified (most recently modified first) before sorting the operands by lexicographical order.',
                default_value: '',
                required: false,
                sequence: 5,
                options: null,
                encoding: '',
                command_level: 'non-destructive',
              },
            ],
          },
          {
            command: 'mount',
            description: 'List or mount filesystem volumes',
            examples:
              'Executable by all RTR roles:\r\nmount\r\nExecutable by privileged RTR users only:\r\nmount -t=nfs "host:/exports/filesystem" "/mnt/filesystem"\r\n    Mount the NFS filesystem located at "/exports/filesystem" on "host" to the local destination "/mnt/filesystem"\r\nmount -t=smbfs "//user:password@host/filesystem" "/mnt/mountpoint"\r\n    Mount the SMB "/filesystem" on "host" as "user" with "password" to "/mnt/mountpoint"\r\nmount -t=smbfs -o=nobrowse "//user:password@host/filesystem" "/mnt/mountpoint"\r\n    Mount the SMB "/filesystem" with option "nobrowse" on "host" as "user" with "password" to "/mnt/mountpoint"',
            internal_only: false,
            runnable: true,
            sub_commands: [],
            args: [],
          },
          {
            command: 'netstat',
            description: 'Display routing information or network connections',
            examples: 'netstat\r\nnetstat -nr',
            internal_only: false,
            runnable: true,
            sub_commands: [],
            args: [
              {
                id: 699,
                created_at: '2020-09-22T00:52:52Z',
                updated_at: '2020-09-22T00:52:52Z',
                script_id: 108,
                arg_type: 'flag',
                data_type: 'string',
                requires_value: false,
                arg_name: 'nr',
                description: 'Flag to show routing information',
                default_value: '',
                required: false,
                sequence: 1,
                options: null,
                encoding: '',
                command_level: 'non-destructive',
              },
            ],
          },
          {
            command: 'ps',
            description: 'Display process information',
            examples: 'ps',
            internal_only: false,
            runnable: true,
            sub_commands: [],
            args: [],
          },
          {
            command: 'pwd',
            description: 'Prints present working directory',
            examples: '',
            internal_only: false,
            runnable: true,
            sub_commands: [],
            args: [],
          },
          {
            command: 'users',
            description: 'Get details about local users',
            examples:
              'users\r\n    List details about all local users\r\nusers foo\r\n    List details about local user "foo"',
            internal_only: false,
            runnable: true,
            sub_commands: [],
            args: [
              {
                id: 719,
                created_at: '2023-03-15T00:28:54Z',
                updated_at: '2023-03-15T00:28:54Z',
                script_id: 117,
                arg_type: 'arg',
                data_type: 'string',
                requires_value: false,
                arg_name: 'UserName',
                description: 'Username to filter results',
                default_value: '',
                required: false,
                sequence: 1,
                options: null,
                encoding: '',
                command_level: 'non-destructive',
              },
            ],
          },
        ],
        existing_aid_sessions: 1,
        created_at: '2024-09-12T07:22:55.684322249Z',
        pwd: '/',
        offline_queued: false,
      },
    ],
    errors: null,
  };
};
