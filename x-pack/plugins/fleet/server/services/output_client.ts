/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { FleetAuthz } from '../../common';

import { OutputUnauthorizedError } from '../errors';
import type { Output } from '../types';

import { outputService } from './output';

export { transformOutputToFullPolicyOutput } from './agent_policies/full_agent_policy';

export interface OutputClientInterface {
  getDefaultDataOutputId(): Promise<string | null>;
  get(outputId: string): Promise<Output>;
}

export class OutputClient implements OutputClientInterface {
  constructor(private soClient: SavedObjectsClientContract, private authz: FleetAuthz) {}

  async getDefaultDataOutputId() {
    if (!this.authz.fleet.readSettings && !this.authz.fleet.readAgentPolicies) {
      throw new OutputUnauthorizedError();
    }
    return outputService.getDefaultDataOutputId(this.soClient);
  }

  async get(outputId: string) {
    if (!this.authz.fleet.readSettings && !this.authz.fleet.readAgentPolicies) {
      throw new OutputUnauthorizedError();
    }
    return outputService.get(this.soClient, outputId);
  }
}
