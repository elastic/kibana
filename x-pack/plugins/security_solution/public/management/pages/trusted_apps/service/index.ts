/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from 'kibana/public';

import pMap from 'p-map';
import {
  TRUSTED_APPS_CREATE_API,
  TRUSTED_APPS_DELETE_API,
  TRUSTED_APPS_GET_API,
  TRUSTED_APPS_LIST_API,
  TRUSTED_APPS_UPDATE_API,
  TRUSTED_APPS_SUMMARY_API,
} from '../../../../../common/endpoint/constants';

import {
  DeleteTrustedAppsRequestParams,
  GetTrustedAppsListResponse,
  GetTrustedAppsListRequest,
  PostTrustedAppCreateRequest,
  PostTrustedAppCreateResponse,
  GetTrustedAppsSummaryResponse,
  PutTrustedAppUpdateRequest,
  PutTrustedAppUpdateResponse,
  PutTrustedAppsRequestParams,
  GetOneTrustedAppRequestParams,
  GetOneTrustedAppResponse,
  GetTrustedAppsSummaryRequest,
  TrustedApp,
  MaybeImmutable,
} from '../../../../../common/endpoint/types';
import { resolvePathVariables } from '../../../../common/utils/resolve_path_variables';

import { sendGetEndpointSpecificPackagePolicies } from '../../policy/store/services/ingest';
import { toUpdateTrustedApp } from '../../../../../common/endpoint/service/trusted_apps/to_update_trusted_app';
import { isGlobalEffectScope } from '../state/type_guards';

export interface TrustedAppsService {
  getTrustedApp(params: GetOneTrustedAppRequestParams): Promise<GetOneTrustedAppResponse>;
  getTrustedAppsList(request: GetTrustedAppsListRequest): Promise<GetTrustedAppsListResponse>;
  deleteTrustedApp(request: DeleteTrustedAppsRequestParams): Promise<void>;
  createTrustedApp(request: PostTrustedAppCreateRequest): Promise<PostTrustedAppCreateResponse>;
  updateTrustedApp(
    params: PutTrustedAppsRequestParams,
    request: PutTrustedAppUpdateRequest
  ): Promise<PutTrustedAppUpdateResponse>;
  getPolicyList(
    options?: Parameters<typeof sendGetEndpointSpecificPackagePolicies>[1]
  ): ReturnType<typeof sendGetEndpointSpecificPackagePolicies>;
  assignPolicyToTrustedApps(
    policyId: string,
    trustedApps: MaybeImmutable<TrustedApp[]>
  ): Promise<PutTrustedAppUpdateResponse[]>;
  removePolicyFromTrustedApps(
    policyId: string,
    trustedApps: MaybeImmutable<TrustedApp[]>
  ): Promise<PutTrustedAppUpdateResponse[]>;
}

const P_MAP_OPTIONS = Object.freeze<pMap.Options>({
  concurrency: 5,
  /** When set to false, instead of stopping when a promise rejects, it will wait for all the promises to settle
   * and then reject with an aggregated error containing all the errors from the rejected promises. */
  stopOnError: false,
});

export class TrustedAppsHttpService implements TrustedAppsService {
  constructor(private http: HttpStart) {}

  async getTrustedApp(params: GetOneTrustedAppRequestParams) {
    return this.http.get<GetOneTrustedAppResponse>(
      resolvePathVariables(TRUSTED_APPS_GET_API, params)
    );
  }

  async getTrustedAppsList(request: GetTrustedAppsListRequest) {
    return this.http.get<GetTrustedAppsListResponse>(TRUSTED_APPS_LIST_API, {
      query: request,
    });
  }

  async deleteTrustedApp(request: DeleteTrustedAppsRequestParams): Promise<void> {
    return this.http.delete<void>(resolvePathVariables(TRUSTED_APPS_DELETE_API, request));
  }

  async createTrustedApp(request: PostTrustedAppCreateRequest) {
    return this.http.post<PostTrustedAppCreateResponse>(TRUSTED_APPS_CREATE_API, {
      body: JSON.stringify(request),
    });
  }

  async updateTrustedApp(
    params: PutTrustedAppsRequestParams,
    updatedTrustedApp: PutTrustedAppUpdateRequest
  ) {
    return this.http.put<PutTrustedAppUpdateResponse>(
      resolvePathVariables(TRUSTED_APPS_UPDATE_API, params),
      { body: JSON.stringify(updatedTrustedApp) }
    );
  }

  async getTrustedAppsSummary(request: GetTrustedAppsSummaryRequest) {
    return this.http.get<GetTrustedAppsSummaryResponse>(TRUSTED_APPS_SUMMARY_API, {
      query: request,
    });
  }

  getPolicyList(options?: Parameters<typeof sendGetEndpointSpecificPackagePolicies>[1]) {
    return sendGetEndpointSpecificPackagePolicies(this.http, options);
  }

  /**
   * Assign a policy to trusted apps. Note that Trusted Apps MUST NOT be global
   *
   * @param policyId
   * @param trustedApps[]
   */
  assignPolicyToTrustedApps(
    policyId: string,
    trustedApps: MaybeImmutable<TrustedApp[]>
  ): Promise<PutTrustedAppUpdateResponse[]> {
    return this._handleAssignOrRemovePolicyId('assign', policyId, trustedApps);
  }

  /**
   * Remove a policy from trusted apps. Note that Trusted Apps MUST NOT be global
   *
   * @param policyId
   * @param trustedApps[]
   */
  removePolicyFromTrustedApps(
    policyId: string,
    trustedApps: MaybeImmutable<TrustedApp[]>
  ): Promise<PutTrustedAppUpdateResponse[]> {
    return this._handleAssignOrRemovePolicyId('remove', policyId, trustedApps);
  }

  private _handleAssignOrRemovePolicyId(
    action: 'assign' | 'remove',
    policyId: string,
    trustedApps: MaybeImmutable<TrustedApp[]>
  ): Promise<PutTrustedAppUpdateResponse[]> {
    if (policyId.trim() === '') {
      throw new Error('policy ID is required');
    }

    if (trustedApps.length === 0) {
      throw new Error('at least one trusted app is required');
    }

    return pMap(
      trustedApps,
      async (trustedApp) => {
        if (isGlobalEffectScope(trustedApp.effectScope)) {
          throw new Error(
            `Unable to update trusted app [${trustedApp.id}] policy assignment. It's effectScope is 'global'`
          );
        }

        const policies: string[] = !isGlobalEffectScope(trustedApp.effectScope)
          ? [...trustedApp.effectScope.policies]
          : [];

        const indexOfPolicyId = policies.indexOf(policyId);

        if (action === 'assign' && indexOfPolicyId === -1) {
          policies.push(policyId);
        } else if (action === 'remove' && indexOfPolicyId !== -1) {
          policies.splice(indexOfPolicyId, 1);
        }

        return this.updateTrustedApp(
          { id: trustedApp.id },
          {
            ...toUpdateTrustedApp(trustedApp),
            effectScope: {
              type: 'policy',
              policies,
            },
          }
        );
      },
      P_MAP_OPTIONS
    );
  }
}
