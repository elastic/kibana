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
import { join as pathJoin, dirname } from 'path';
import type { DownloadedAgentInfo } from './agent_downloads_service';
import { BaseDataGenerator } from '../../../common/endpoint/data_generators/base_data_generator';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import type { HostVm, HostVmExecResponse, SupportedVmManager } from './types';

const baseGenerator = new BaseDataGenerator();
export const DEFAULT_VAGRANTFILE = pathJoin(__dirname, 'vagrant', 'Vagrantfile');

export interface BaseVmCreateOptions {
  name: string;
  /** Number of CPUs */
  cpus?: number;
  /** Disk size */
  disk?: string;
  /** Amount of memory */
  memory?: string;
}

type CreateVmOptions = CreateMultipassVmOptions | CreateVagrantVmOptions;

/**
 * Creates a new VM
 */
export const createVm = async (options: CreateVmOptions): Promise<HostVm> => {
  if (options.type === 'multipass') {
    return createMultipassVm(options);
  }

  return createVagrantVm(options);
};

interface CreateMultipassVmOptions extends BaseVmCreateOptions {
  type: SupportedVmManager & 'multipass';
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
    const response = await execa.command(`multipass unmount ${name}:${hostVmDir}`);
    log.verbose(`multipass unmount response:\n`, response);
  };

  const mount = async (localDir: string, hostVmDir: string) => {
    const response = await execa.command(`multipass mount ${localDir} ${name}:${hostVmDir}`);
    log.verbose(`multipass mount response:\n`, response);

    return {
      hostDir: hostVmDir,
      unmount: () => unmount(hostVmDir),
    };
  };

  const start = async () => {
    const response = await execa.command(`multipass start ${name}`);
    log.verbose(`multipass start response:\n`, response);
  };

  const stop = async () => {
    const response = await execa.command(`multipass stop ${name}`);
    log.verbose(`multipass stop response:\n`, response);
  };

  const transfer: HostVm['transfer'] = async (localFilePath, destFilePath) => {
    const response = await execa.command(
      `multipass transfer ${localFilePath} ${name}:${destFilePath}`
    );
    log.verbose(`Transferred file to VM [${name}]:`, response);

    return {
      filePath: destFilePath,
      delete: async () => {
        return exec(`rm ${destFilePath}`);
      },
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
    transfer,
    start,
    stop,
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
  const listOfVMs = await findVm('multipass');

  if (listOfVMs.data.length > threshold) {
    return `-----------------------------------------------------------------
${chalk.red('NOTE:')} ${chalk.bold(
      chalk.red(`You currently have ${chalk.red(listOfVMs.data.length)} VMs running.`)
    )}
      Remember to delete those no longer being used.
      View running VMs: ${chalk.cyan('multipass list')}
  -----------------------------------------------------------------
`;
  }

  return '';
};

interface CreateVagrantVmOptions extends BaseVmCreateOptions {
  type: SupportedVmManager & 'vagrant';

  name: string;
  /**
   * The downloaded agent information. The Agent file will be uploaded to the Vagrant VM and
   * made available under the default login home directory (`~/agent-filename`)
   */
  agentDownload: DownloadedAgentInfo;
  /**
   * The path to the Vagrantfile to use to provision the VM. Defaults to Vagrantfile under:
   * `x-pack/plugins/security_solution/scripts/endpoint/common/vagrant/Vagrantfile`
   */
  vagrantFile?: string;
  log?: ToolingLog;
}

/**
 * Creates a new VM using `vagrant`
 */
const createVagrantVm = async ({
  name,
  log = createToolingLogger(),
  agentDownload: { fullFilePath: agentFullFilePath, filename: agentFileName },
  vagrantFile = DEFAULT_VAGRANTFILE,
  memory,
  cpus,
  disk,
}: CreateVagrantVmOptions): Promise<HostVm> => {
  log.debug(`Using Vagrantfile: ${vagrantFile}`);

  const VAGRANT_CWD = dirname(vagrantFile);

  // Destroy the VM running (if any) with the provided vagrant file before re-creating it
  try {
    await execa.command(`vagrant destroy -f`, {
      env: {
        VAGRANT_CWD,
      },
      // Only `pipe` STDERR to parent process
      stdio: ['inherit', 'inherit', 'pipe'],
    });
    // eslint-disable-next-line no-empty
  } catch (e) {}

  if (memory || cpus || disk) {
    log.warning(
      `cpu, memory and disk options ignored for creation of vm via Vagrant. These should be defined in the Vagrantfile`
    );
  }

  try {
    const vagrantUpResponse = (
      await execa.command(`vagrant up`, {
        env: {
          VAGRANT_DISABLE_VBOXSYMLINKCREATE: '1',
          VAGRANT_CWD,
          VMNAME: name,
          CACHED_AGENT_SOURCE: agentFullFilePath,
          CACHED_AGENT_FILENAME: agentFileName,
          AGENT_DESTINATION_FOLDER: agentFileName.replace('.tar.gz', ''),
        },
        // Only `pipe` STDERR to parent process
        stdio: ['inherit', 'inherit', 'pipe'],
      })
    ).stdout;

    log.debug(`Vagrant up command response: `, vagrantUpResponse);
  } catch (e) {
    log.error(e);
    throw e;
  }

  return createVagrantHostVmClient(name, undefined, log);
};

/**
 * Creates a generic interface (`HotVm`) for interacting with a VM created by Vagrant
 * @param name
 * @param log
 * @param vagrantFile
 */
export const createVagrantHostVmClient = (
  name: string,
  vagrantFile: string = DEFAULT_VAGRANTFILE,
  log: ToolingLog = createToolingLogger()
): HostVm => {
  const VAGRANT_CWD = dirname(vagrantFile);
  const execaOptions: execa.Options = {
    env: {
      VAGRANT_CWD,
    },
    stdio: ['inherit', 'pipe', 'pipe'],
  };

  log.debug(`Creating Vagrant VM client for [${name}] with vagrantfile [${vagrantFile}]`);

  const exec = async (command: string): Promise<HostVmExecResponse> => {
    const execResponse = await execa.command(`vagrant ssh -- ${command}`, execaOptions);

    log.verbose(execResponse);

    return {
      stdout: execResponse.stdout,
      stderr: execResponse.stderr,
      exitCode: execResponse.exitCode,
    };
  };

  const destroy = async (): Promise<void> => {
    const destroyResponse = await execa.command(`vagrant destroy -f`, execaOptions);

    log.debug(`VM [${name}] was destroyed successfully`, destroyResponse);
  };

  const info = () => {
    return `VM created using Vagrant.
  VM Name: ${name}

  Shell access: ${chalk.cyan(`vagrant ssh ${name}`)}
  Delete VM:    ${chalk.cyan(`vagrant destroy ${name} -f`)}
`;
  };

  const unmount = async (_: string) => {
    throw new Error('VM action `unmount`` not currently supported for vagrant');
  };

  const mount = async (_: string, __: string) => {
    throw new Error('VM action `mount` not currently supported for vagrant');
  };

  const start = async () => {
    const response = await execa.command(`vagrant up`, execaOptions);
    log.verbose('vagrant up response:\n', response);
  };

  const stop = async () => {
    const response = await execa.command(`vagrant suspend`, execaOptions);
    log.verbose('vagrant suspend response:\n', response);
  };

  const transfer: HostVm['transfer'] = async (localFilePath, destFilePath) => {
    const response = await execa.command(
      `vagrant upload ${localFilePath} ${destFilePath}`,
      execaOptions
    );
    log.verbose(`Transferred file to VM [${name}]:`, response);

    return {
      filePath: destFilePath,
      delete: async () => {
        return exec(`rm ${destFilePath}`);
      },
    };
  };

  return {
    type: 'vagrant',
    name,
    exec,
    destroy,
    info,
    mount,
    unmount,
    transfer,
    start,
    stop,
  };
};

/**
 * create and return a Host VM client client
 * @param hostname
 * @param type
 * @param vagrantFile
 * @param log
 */
export const getHostVmClient = (
  hostname: string,
  type: SupportedVmManager = process.env.CI ? 'vagrant' : 'multipass',
  /** Will only be used if `type` is `vagrant` */
  vagrantFile: string = DEFAULT_VAGRANTFILE,
  log: ToolingLog = createToolingLogger()
): HostVm => {
  return type === 'vagrant'
    ? createVagrantHostVmClient(hostname, vagrantFile, log)
    : createMultipassHostVmClient(hostname, log);
};

/**
 * Retrieve a list of running VM names
 * @param type
 * @param name
 * @param log
 */
export const findVm = async (
  type: SupportedVmManager,
  /** Filter results by VM name */
  name?: string | RegExp,
  log: ToolingLog = createToolingLogger()
): Promise<{ data: string[] }> => {
  log.verbose(`Finding [${type}] VMs with name [${name}]`);

  if (type === 'multipass') {
    const list = JSON.parse((await execa.command(`multipass list --format json`)).stdout) as {
      list: Array<{
        ipv4: string[];
        name: string;
        release: string;
        state: string;
      }>;
    };

    log.verbose(`List of VM running:`, list);

    if (!list.list || list.list.length === 0) {
      return { data: [] };
    }

    return {
      data: !name
        ? list.list.map((vmEntry) => vmEntry.name)
        : list.list.reduce((acc, vmEntry) => {
            if (typeof name === 'string') {
              if (vmEntry.name === name) {
                acc.push(vmEntry.name);
              }
            } else {
              if (name.test(vmEntry.name)) {
                acc.push(vmEntry.name);
              }
            }

            return acc;
          }, [] as string[]),
    };
  }

  throw new Error(`findVm() does not yet have support for [${type}]`);
};
