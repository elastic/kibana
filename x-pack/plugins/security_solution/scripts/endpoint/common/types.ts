/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generic common interface for a Host Virtual Machine.
 */
export interface HostVm {
  type: SupportedVmManager;
  name: string;
  exec: (command: string) => Promise<HostVmExecResponse>;
  mount: (localDir: string, hostVmDir: string) => Promise<HostVmMountResponse>;
  unmount: (hostVmDir: string) => Promise<void>;
  /** Uploads/copies a file from the local machine to the VM */
  transfer: (localFilePath: string, destFilePath: string) => Promise<HostVmTransferResponse>;
  destroy: () => Promise<void>;
  info: () => string;
  stop: () => void;
  start: () => void;
}

export type SupportedVmManager = 'multipass' | 'vagrant';
export interface HostVmExecResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
}
export interface HostVmMountResponse {
  hostDir: string;
  unmount: () => Promise<void>;
}
export interface HostVmTransferResponse {
  /** The file path of the file on the host vm */
  filePath: string;
  /** Delete the file from the host VM */
  delete: () => Promise<HostVmExecResponse>;
}
