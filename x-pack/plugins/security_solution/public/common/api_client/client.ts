/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptions } from '@kbn/core-http-browser';
import { createRule } from '../../../common/api/detection_engine/rule_management/crud/create_rule/create_rule_route.api_client.gen';
import { deleteRule } from '../../../common/api/detection_engine/rule_management/crud/delete_rule/delete_rule_route.api_client.gen';
import { readRule } from '../../../common/api/detection_engine/rule_management/crud/read_rule/read_rule_route.api_client.gen';
import { patchRule } from '../../../common/api/detection_engine/rule_management/crud/patch_rule/patch_rule_route.api_client.gen';
import { updateRule } from '../../../common/api/detection_engine/rule_management/crud/update_rule/update_rule_route.api_client.gen';

interface HttpClient {
  fetch<T>(url: string, options: HttpFetchOptions): Promise<T>;
}

export class ApiClient<TClient extends HttpClient> {

  private client: TClient;

  constructor(client: TClient) {
    this.client = client;
  }

  public async createRule(params, signal) {
    return createRule(this.client, params, signal);
  }

  public async deleteRule(params, signal) {
    return deleteRule(this.client, params, signal);
  }

  public async readRule(params, signal) {
    return readRule(this.client, params, signal);
  }

  public async patchRule(params, signal) {
    return patchRule(this.client, params, signal);
  }

  public async updateRule(params, signal) {
    return updateRule(this.client, params, signal);
  }


}