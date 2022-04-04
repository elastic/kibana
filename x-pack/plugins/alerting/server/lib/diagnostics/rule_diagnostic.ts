/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Request } from '@hapi/hapi';
import type { DiagnosticResult, RuleTypeParams } from '../../types';
import { addSpaceIdToPath } from '../../../../spaces/server';
import { KibanaRequest, IBasePath } from '../../../../../../src/core/server';
import type { CreateAPIKeyResult } from '../../rules_client/rules_client';

export type CustomDiagnostic<Params extends RuleTypeParams = never> = (
  params: Params
) => DiagnosticResult;

export interface Diagnostics {
  // This indicates which fields inside the rule params
  // specification stores the target indices. This is not meant
  // to store actual index or data view names.
  indices?: string[];

  // This indicates which fields inside the rule params
  // specification stores group by fields. This is not meant to store
  // actual field names.
  groupedFields?: string[];

  // This allows rule type to store custom diagnostic functions.
  // Each function should take the rule params as input and return
  // a user-friendly diagnostic name message.
  custom?: CustomDiagnostic[];
}

const DIAGNOSTICS_DISABLED = {
  name: 'Diagnostics disabled',
  message: 'Rule diagnostics have not been enabled for this rule type',
};

const NO_INDICES_SPECIFIED = {
  name: 'No indices specified',
  message: 'Unable to determine which indices to use for diagnostic',
};

interface ConstructorOpts {
  basePathService: IBasePath;
  spaceId?: string;
  createAPIKey: (name: string) => Promise<CreateAPIKeyResult>;
}

interface DiagnoseOpts<Params extends RuleTypeParams> {
  params: Params;
  diagnostics?: Diagnostics;
  ruleTypeId: string;
  username: string | null;
}

interface DiagnoseIndicesOpts<Params extends RuleTypeParams> {
  params: Params;
  indices: string[];
  fakeRequest: KibanaRequest;
}

export class RuleDiagnostic {
  private readonly basePathService: IBasePath;
  private readonly spaceId: string;
  private readonly createAPIKey: (name: string) => Promise<CreateAPIKeyResult>;

  constructor({ basePathService, spaceId, createAPIKey }: ConstructorOpts) {
    this.basePathService = basePathService;
    this.createAPIKey = createAPIKey;
    this.spaceId = spaceId ?? 'default';
  }

  public async diagnose<Params extends RuleTypeParams>({
    params,
    diagnostics,
    ruleTypeId,
    username,
  }: DiagnoseOpts<Params>) {
    console.log(`rule type diagnostic`);
    console.log(diagnostics);
    console.log(params);
    console.log(ruleTypeId);
    console.log(username);
    const results: DiagnosticResult[] = [];
    if (diagnostics) {
      if (diagnostics.indices) {
        const fakeRequest = await this.setup(username, ruleTypeId);
        results.push(this.diagnoseIndices({ indices: diagnostics.indices, params, fakeRequest }));
      }
    } else {
      results.push(DIAGNOSTICS_DISABLED);
    }

    return results;
  }

  private async setup(username: string, ruleTypeId: string) {
    // Create an API key and fake request for searching against indices
    const apiKey = await this.createAPIKey(`Alerting diagnostic: ${ruleTypeId}`);
    const apiKeyValue = this.apiKeyAsString(apiKey, username);
    return this.getFakeKibanaRequest(this.spaceId, apiKeyValue);
  }

  private diagnoseIndices<Params extends RuleTypeParams>({
    indices,
    params,
    fakeRequest,
  }: DiagnoseIndicesOpts<Params>): DiagnosticResult {
    if (indices.length > 0) {
    }

    return NO_INDICES_SPECIFIED;
  }

  private apiKeyAsString(
    apiKey: CreateAPIKeyResult | null,
    username: string | null
  ): string | null {
    return apiKey && apiKey.apiKeysEnabled
      ? Buffer.from(`${apiKey.result.id}:${apiKey.result.api_key}`).toString('base64')
      : null;
  }

  private getFakeKibanaRequest(spaceId: string, apiKey: string | null) {
    const requestHeaders: Record<string, string> = {};

    if (apiKey) {
      requestHeaders.authorization = `ApiKey ${apiKey}`;
    }

    const path = addSpaceIdToPath('/', spaceId);

    const fakeRequest = KibanaRequest.from({
      headers: requestHeaders,
      path: '/',
      route: { settings: {} },
      url: {
        href: '/',
      },
      raw: {
        req: {
          url: '/',
        },
      },
    } as unknown as Request);

    this.basePathService.set(fakeRequest, path);

    return fakeRequest;
  }
}
