/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface CloudEcs {
  instance?: CloudInstanceEcs;
  machine?: CloudMachineEcs;
  provider?: string[];
  region?: string[];
}

export interface CloudMachineEcs {
  type?: string[];
}

export interface CloudInstanceEcs {
  id?: string[];
}
