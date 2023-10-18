/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface HostVm {
  type: 'multipass'; // future: support vagrant
  name: string;
  exec: (command: string) => Promise<HostVmExecResponse>;
  destroy: () => Promise<void>;
  info: () => string;
}

export interface HostVmExecResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
}
