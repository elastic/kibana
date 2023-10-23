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
  destroy: () => Promise<void>;
  info: () => string;
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
