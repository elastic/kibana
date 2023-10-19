/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import chalk from 'chalk';
import type { HostVm, HostVmExecResponse } from './types';
import type { DownloadedAgentInfo } from './agent_downloads_service';

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
  type: 'multipass' | 'vagrant';
  log?: ToolingLog;
}

/**
 * Creates a new VM
 */
export const createVm = async ({ type, log, ...options }: CreateVmOptions): Promise<HostVm> => {
  if (type === 'multipass') {
    return createMultipassVm({ ...options, log });
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
  // FIXME:PT use `createToolingLogger()` when that is available
  log = new ToolingLog({ level: 'info', writeTo: process.stdout }),
}: CreateMultipassVmOptions): Promise<HostVm> => {
  log.info(`Creating VM [${name}] using multipass`);

  // TODO:PT validate multipass is installed

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
export const createMultipassHostVmClient = (name: string, log: ToolingLog): HostVm => {
  // FIXME:PT make log optional adn use new createToolingLogger()

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

interface CreateVagrantVmOptions {
  name: string;
  cachedAgentDownload: DownloadedAgentInfo;
  log?: ToolingLog;
}

const createVagrantVm = async ({
  name,
  cachedAgentDownload,
  log,
}: CreateVagrantVmOptions): Promise<HostVm> => {
  throw new Error(`not implemented (yet)`);

  // FIXME:PT implement

  // TODO:PT Validate vagrant is available

  // try {
  //   await execa.command(`vagrant up`, {
  //     env: {
  //       VAGRANT_DISABLE_VBOXSYMLINKCREATE: '1',
  //       VAGRANT_CWD,
  //       VMNAME: name,
  //       CACHED_AGENT_SOURCE: cachedAgentDownload.fullFilePath,
  //       CACHED_AGENT_FILENAME: cachedAgentDownload.filename,
  //     },
  //     stdio: ['inherit', 'inherit', 'inherit'],
  //   });
  // } catch (e) {
  //   log.error(e);
  //   throw e;
  // }
  //
  // return {
  //   name,
  // };
};
