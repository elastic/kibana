/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRule } from './/Users/jpdjeredjian/Elastic/kibana-pr3/x-pack/plugins/security_solution/common/api/detection_engine/rule_management/crud/create_rule/create_rule_route.api_client.gen.ts';
import { deleteRule } from './/Users/jpdjeredjian/Elastic/kibana-pr3/x-pack/plugins/security_solution/common/api/detection_engine/rule_management/crud/delete_rule/delete_rule_route.api_client.gen.ts';
import { patchRule } from './/Users/jpdjeredjian/Elastic/kibana-pr3/x-pack/plugins/security_solution/common/api/detection_engine/rule_management/crud/patch_rule/patch_rule_route.api_client.gen.ts';
import { readRule } from './/Users/jpdjeredjian/Elastic/kibana-pr3/x-pack/plugins/security_solution/common/api/detection_engine/rule_management/crud/read_rule/read_rule_route.api_client.gen.ts';
import { updateRule } from './/Users/jpdjeredjian/Elastic/kibana-pr3/x-pack/plugins/security_solution/common/api/detection_engine/rule_management/crud/update_rule/update_rule_route.api_client.gen.ts';

import { KibanaServices } from '../kibana_services';
import { CreateRuleApiClient } from './create_rule_api_client';

export class ApiClient {
  private client: TClient;

  constructor(client: TClient) {
    this.client = client;
  }

  public async createRule(params, signal) {
    return await createRule(this.client, params, signal);
  }

  public async deleteRule(params, signal) {
    return await deleteRule(this.client, params, signal);
  }

  public async patchRule(params, signal) {
    return await patchRule(this.client, params, signal);
  }

  public async readRule(params, signal) {
    return await readRule(this.client, params, signal);
  }

  public async updateRule(params, signal) {
    return await updateRule(this.client, params, signal);
  }
}
