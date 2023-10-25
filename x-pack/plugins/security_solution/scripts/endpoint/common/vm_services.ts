/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import chalk from 'chalk';
import { userInfo } from 'os';
import { BaseDataGenerator } from '../../../common/endpoint/data_generators/base_data_generator';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import type { HostVm, HostVmExecResponse, SupportedVmManager } from './types';

const baseGenerator = new BaseDataGenerator();

interface BaseVmCreateOptions {
  name: string;
  /** Number of CPUs */
  cpus?: number;
  /** Disk size */
  disk?: string;
  /** Amount of memory */
  memory?: string;
}

interface CreateVmOptions extends BaseVmCreateOptions {
  /** The type of VM manager to use when creating the VM host */
  type: SupportedVmManager;
  log?: ToolingLog;
}

/**
 * Creates a new VM
 */
export const createVm = async ({ type, ...options }: CreateVmOptions): Promise<HostVm> => {
  if (type === 'multipass') {
    return createMultipassVm(options);
  }

  throw new Error(`VM type ${type} not yet supported`);
};

interface CreateMultipassVmOptions extends BaseVmCreateOptions {
  name: string;
  log?: ToolingLog;
}

const createMultipassVm = async ({
  name,
  disk = '8G',
  cpus = 1,
  memory = '1G',
  log = createToolingLogger(),
}: CreateMultipassVmOptions): Promise<HostVm> => {
  log.info(`Creating VM [${name}] using multipass`);

  const createResponse = await execa.command(
    `multipass launch --name ${name} --disk ${disk} --cpus ${cpus} --memory ${memory}`
  );

  log.verbose(`VM [${name}] created successfully using multipass.`, createResponse);

  return createMultipassHostVmClient(name, log);
};

/**
 * Creates a standard client for interacting with a Multipass VM
 * @param name
 * @param log
 */
export const createMultipassHostVmClient = (
  name: string,
  log: ToolingLog = createToolingLogger()
): HostVm => {
  const exec = async (command: string): Promise<HostVmExecResponse> => {
    const execResponse = await execa.command(`multipass exec ${name} -- ${command}`);

    log.verbose(execResponse);

    return {
      stdout: execResponse.stdout,
      stderr: execResponse.stderr,
      exitCode: execResponse.exitCode,
    };
  };

  const destroy = async (): Promise<void> => {
    const destroyResponse = await execa.command(`multipass delete -p ${name}`);
    log.verbose(`VM [${name}] was destroyed successfully`, destroyResponse);
  };

  const info = () => {
    return `VM created using Multipass.
  VM Name: ${name}

  Shell access: ${chalk.cyan(`multipass shell ${name}`)}
  Delete VM:    ${chalk.cyan(`multipass delete -p ${name}`)}
`;
  };

  const unmount = async (hostVmDir: string) => {
    await execa.command(`multipass unmount ${name}:${hostVmDir}`);
  };

  const mount = async (localDir: string, hostVmDir: string) => {
    await execa.command(`multipass mount ${localDir} ${name}:${hostVmDir}`);

    return {
      hostDir: hostVmDir,
      unmount: () => unmount(hostVmDir),
    };
  };

  return {
    type: 'multipass',
    name,
    exec,
    destroy,
    info,
    mount,
    unmount,
  };
};

/**
 * Generates a unique Virtual Machine name using the current user's `username`
 * @param identifier
 */
export const generateVmName = (identifier: string = baseGenerator.randomUser()): string => {
  return `${userInfo().username.toLowerCase().replaceAll('.', '-')}-${identifier
    .toLowerCase()
    .replace('.', '-')}-${Math.random().toString().substring(2, 6)}`;
};

/**
 * Checks if the count of VM running under Multipass is greater than the `threshold` passed on
 * input and if so, it will return a message indicate so. Useful to remind users of the amount of
 * VM currently running.
 * @param threshold
 */
export const getMultipassVmCountNotice = async (threshold: number = 1): Promise<string> => {
  const response = await execa.command(`multipass list --format=json`);

  const output: { list: Array<{ ipv4: string; name: string; release: string; state: string }> } =
    JSON.parse(response.stdout);

  if (output.list.length > threshold) {
    return `-----------------------------------------------------------------
${chalk.red('NOTE:')} ${chalk.bold(
      chalk.cyan(`You currently have ${chalk.red(output.list.length)} VMs running.`)
    )} Remember to delete those
      no longer being used.
      View running VMs: ${chalk.bold('multipass list')}
  -----------------------------------------------------------------
`;
  }

  return '';
};
