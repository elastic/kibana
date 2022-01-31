/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExceptionListItemSchema,
  ExceptionListSchema,
  ExceptionListSummarySchema,
  FoundExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  ENDPOINT_TRUSTED_APPS_LIST_ID,
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';
import { HttpStart } from 'kibana/public';
import pMap from 'p-map';
import { toUpdateTrustedApp } from '../../../../../common/endpoint/service/trusted_apps/to_update_trusted_app';
import {
  DeleteTrustedAppsRequestParams,
  GetOneTrustedAppRequestParams,
  GetOneTrustedAppResponse,
  GetTrustedAppsListRequest,
  GetTrustedAppsListResponse,
  MaybeImmutable,
  PostTrustedAppCreateRequest,
  PostTrustedAppCreateResponse,
  PutTrustedAppsRequestParams,
  PutTrustedAppUpdateRequest,
  PutTrustedAppUpdateResponse,
  TrustedApp,
} from '../../../../../common/endpoint/types';
import { sendGetEndpointSpecificPackagePolicies } from '../../../services/policies/policies';
import { TRUSTED_APPS_EXCEPTION_LIST_DEFINITION } from '../constants';
import { isGlobalEffectScope } from '../state/type_guards';
import {
  exceptionListItemToTrustedApp,
  newTrustedAppToCreateExceptionListItem,
  updatedTrustedAppToUpdateExceptionListItem,
} from './mappers';
import { validateTrustedAppHttpRequestBody } from './validate_trusted_app_http_request_body';

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
  private readonly getHttpService: () => Promise<HttpStart>;

  constructor(http: HttpStart) {
    let ensureListExists: Promise<void>;

    this.getHttpService = async () => {
      if (!ensureListExists) {
        ensureListExists = http
          .post<ExceptionListSchema>(EXCEPTION_LIST_URL, {
            body: JSON.stringify(TRUSTED_APPS_EXCEPTION_LIST_DEFINITION),
          })
          .then(() => {})
          .catch((err) => {
            if (err.response.status !== 409) {
              return Promise.reject(err);
            }
          });
      }

      await ensureListExists;
      return http;
    };
  }

  private async getExceptionListItem(itemId: string): Promise<ExceptionListItemSchema> {
    return (await this.getHttpService()).get<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
      query: {
        item_id: itemId,
        namespace_type: 'agnostic',
      },
    });
  }

  async getTrustedApp(params: GetOneTrustedAppRequestParams) {
    const exceptionItem = await this.getExceptionListItem(params.id);

    return {
      data: exceptionListItemToTrustedApp(exceptionItem),
    };
  }

  async getTrustedAppsList({
    page = 1,
    per_page: perPage = 10,
    kuery,
  }: GetTrustedAppsListRequest): Promise<GetTrustedAppsListResponse> {
    const itemListResults = await (
      await this.getHttpService()
    ).get<FoundExceptionListItemSchema>(`${EXCEPTION_LIST_ITEM_URL}/_find`, {
      query: {
        page,
        per_page: perPage,
        filter: kuery,
        sort_field: 'name',
        sort_order: 'asc',
        list_id: [ENDPOINT_TRUSTED_APPS_LIST_ID],
        namespace_type: ['agnostic'],
      },
    });

    return {
      ...itemListResults,
      data: itemListResults.data.map(exceptionListItemToTrustedApp),
    };
  }

  async deleteTrustedApp(request: DeleteTrustedAppsRequestParams): Promise<void> {
    await (
      await this.getHttpService()
    ).delete<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
      query: {
        item_id: request.id,
        namespace_type: 'agnostic',
      },
    });
  }

  async createTrustedApp(request: PostTrustedAppCreateRequest) {
    await validateTrustedAppHttpRequestBody(await this.getHttpService(), request);

    const newTrustedAppException = newTrustedAppToCreateExceptionListItem(request);
    const createdExceptionItem = await (
      await this.getHttpService()
    ).post<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
      body: JSON.stringify(newTrustedAppException),
    });

    return {
      data: exceptionListItemToTrustedApp(createdExceptionItem),
    };
  }

  async updateTrustedApp(
    params: PutTrustedAppsRequestParams,
    updatedTrustedApp: PutTrustedAppUpdateRequest
  ) {
    const [currentExceptionListItem] = await Promise.all([
      await this.getExceptionListItem(params.id),
      await validateTrustedAppHttpRequestBody(await this.getHttpService(), updatedTrustedApp),
    ]);

    const updatedExceptionListItem = await (
      await this.getHttpService()
    ).put<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
      body: JSON.stringify(
        updatedTrustedAppToUpdateExceptionListItem(currentExceptionListItem, updatedTrustedApp)
      ),
    });

    return {
      data: exceptionListItemToTrustedApp(updatedExceptionListItem),
    };
  }

  async getTrustedAppsSummary(filter?: string) {
    return (await this.getHttpService()).get<ExceptionListSummarySchema>(
      `${EXCEPTION_LIST_URL}/summary`,
      {
        query: {
          filter,
          list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
          namespace_type: 'agnostic',
        },
      }
    );
  }

  async getPolicyList(options?: Parameters<typeof sendGetEndpointSpecificPackagePolicies>[1]) {
    return sendGetEndpointSpecificPackagePolicies(await this.getHttpService(), options);
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
