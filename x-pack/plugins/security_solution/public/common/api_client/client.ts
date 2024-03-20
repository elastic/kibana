/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptions } from '@kbn/core-http-browser';
  import type { CreateRuleRequestBody } from '../../../common/api/detection_engine/rule_management/crud/create_rule/create_rule_route.gen';

import { createRule } from '../../../common/api/detection_engine/rule_management/crud/create_rule/create_rule_route.api_method.gen';
  import type { DeleteRuleRequestQuery } from '../../../common/api/detection_engine/rule_management/crud/delete_rule/delete_rule_route.gen';

import { deleteRule } from '../../../common/api/detection_engine/rule_management/crud/delete_rule/delete_rule_route.api_method.gen';
  import type { PatchRuleRequestBody } from '../../../common/api/detection_engine/rule_management/crud/patch_rule/patch_rule_route.gen';

import { patchRule } from '../../../common/api/detection_engine/rule_management/crud/patch_rule/patch_rule_route.api_method.gen';
  import type { ReadRuleRequestQuery } from '../../../common/api/detection_engine/rule_management/crud/read_rule/read_rule_route.gen';

import { readRule } from '../../../common/api/detection_engine/rule_management/crud/read_rule/read_rule_route.api_method.gen';
  import type { UpdateRuleRequestBody } from '../../../common/api/detection_engine/rule_management/crud/update_rule/update_rule_route.gen';

import { updateRule } from '../../../common/api/detection_engine/rule_management/crud/update_rule/update_rule_route.api_method.gen';

interface HttpClient {
  fetch<T>(url: string, options: HttpFetchOptions): Promise<T>;
}

export class ApiClient<TClient extends HttpClient> {

  private client: TClient;

  constructor(client: TClient) {
    this.client = client;
  }

 /*
  * Create a single detection rule
  */
  public async createRule(
  params: CreateRuleRequestBody, 
  signal?: AbortSignal
  ) {
    return createRule(
      this.client,
        params,
      signal
    );
  }

 /*
  * Deletes a single rule using the &#x60;rule_id&#x60; or &#x60;id&#x60; field.
  */
  public async deleteRule(
  query: DeleteRuleRequestQuery,
  signal?: AbortSignal
  ) {
    return deleteRule(
      this.client,
      query,
      signal
    );
  }

 /*
  * Patch a single rule
  */
  public async patchRule(
  params: PatchRuleRequestBody, 
  signal?: AbortSignal
  ) {
    return patchRule(
      this.client,
        params,
      signal
    );
  }

 /*
  * Read a single rule
  */
  public async readRule(
  query: ReadRuleRequestQuery,
  signal?: AbortSignal
  ) {
    return readRule(
      this.client,
      query,
      signal
    );
  }

 /*
  * Update a single rule
  */
  public async updateRule(
  params: UpdateRuleRequestBody, 
  signal?: AbortSignal
  ) {
    return updateRule(
      this.client,
        params,
      signal
    );
  }


}