/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GetPolicyListResponse, PolicyListState } from '../../types';
import {
  sendGetEndpointSpecificPackageConfigs,
  sendDeletePackageConfig,
  sendGetFleetAgentStatusForConfig,
  sendGetEndpointSecurityPackage,
} from './services/ingest';
import { endpointPackageInfo, isOnPolicyListPage, urlSearchParams } from './selectors';
import { ImmutableMiddlewareFactory } from '../../../../../common/store';
import { initialPolicyListState } from './reducer';
import {
  DeletePackageConfigsResponse,
  DeletePackageConfigsRequest,
  GetAgentStatusResponse,
} from '../../../../../../../ingest_manager/common';

export const policyListMiddlewareFactory: ImmutableMiddlewareFactory<PolicyListState> = (
  coreStart
) => {
  const http = coreStart.http;

  return ({ getState, dispatch }) => (next) => async (action) => {
    next(action);

    const state = getState();
    if (
      (action.type === 'userChangedUrl' && isOnPolicyListPage(state)) ||
      action.type === 'serverDeletedPolicy'
    ) {
      if (!endpointPackageInfo(state)) {
        // We only need the package information to retrieve the version number,
        // and even if we don't have the version, the UI is still ok because we
        // handle that condition. Because of this, we retrieve the package information
        // in a non-blocking way here and also ignore any API failures (only log it
        // to the console)
        sendGetEndpointSecurityPackage(http)
          .then((packageInfo) => {
            dispatch({
              type: 'serverReturnedEndpointPackageInfo',
              payload: packageInfo,
            });
          })
          .catch((error) => {
            // eslint-disable-next-line no-console
            console.error(error);
          });
      }

      const { page_index: pageIndex, page_size: pageSize } = urlSearchParams(state);
      let response: GetPolicyListResponse;

      try {
        response = await sendGetEndpointSpecificPackageConfigs(http, {
          query: {
            perPage: pageSize,
            page: pageIndex + 1,
          },
        });
      } catch (err) {
        dispatch({
          type: 'serverFailedToReturnPolicyListData',
          payload: err.body ?? err,
        });
        return;
      }

      dispatch({
        type: 'serverReturnedPolicyListData',
        payload: {
          policyItems: response ? response.items : initialPolicyListState().policyItems,
          pageIndex,
          pageSize,
          total: response ? response.total : initialPolicyListState().total,
        },
      });
    } else if (action.type === 'userClickedPolicyListDeleteButton') {
      const { policyId } = action.payload;
      const packageConfigIds: DeletePackageConfigsRequest['body']['packageConfigIds'] = [policyId];
      let apiResponse: DeletePackageConfigsResponse;
      try {
        apiResponse = await sendDeletePackageConfig(http, { body: { packageConfigIds } });
      } catch (err) {
        dispatch({
          type: 'serverDeletedPolicyFailure',
          payload: err.body ?? err,
        });
        return;
      }

      dispatch({
        type: 'serverDeletedPolicy',
        payload: {
          id: apiResponse ? apiResponse[0].id : '',
          success: true,
        },
      });
    } else if (action.type === 'userOpenedPolicyListDeleteModal') {
      const { agentConfigId } = action.payload;
      let apiResponse: GetAgentStatusResponse;
      try {
        apiResponse = await sendGetFleetAgentStatusForConfig(http, agentConfigId);
      } catch (err) {
        dispatch({
          type: 'serverReturnedPolicyAgentsSummaryForDeleteFailure',
          payload: err.body ?? err,
        });
        return;
      }
      dispatch({
        type: 'serverReturnedPolicyAgentsSummaryForDelete',
        payload: {
          agentStatusSummary: apiResponse.results,
        },
      });
    }
  };
};
