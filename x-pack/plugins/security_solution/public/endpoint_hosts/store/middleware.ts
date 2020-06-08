/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GetPackagesResponse } from '../../../../ingest_manager/common';
import { HostResultList } from '../../../common/endpoint/types';
import { ImmutableMiddlewareFactory } from '../../common/store';
import { isOnHostPage, hasSelectedHost, uiQueryParams, listData } from './selectors';
import { HostState } from '../types';
import { sendGetSecurityPackages } from '../../management/pages/policy/store/policy_list/services/ingest';

export const hostMiddlewareFactory: ImmutableMiddlewareFactory<HostState> = (coreStart) => {
  const http = coreStart.http;
  return ({ getState, dispatch }) => (next) => async (action) => {
    next(action);
    const state = getState();
    if (
      action.type === 'userChangedUrl' &&
      isOnHostPage(state) &&
      hasSelectedHost(state) !== true
    ) {
      const { page_index: pageIndex, page_size: pageSize } = uiQueryParams(state);
      try {
        const response = await coreStart.http.post<HostResultList>('/api/endpoint/metadata', {
          body: JSON.stringify({
            paging_properties: [{ page_index: pageIndex }, { page_size: pageSize }],
          }),
        });
        response.request_page_index = Number(pageIndex);
        dispatch({
          type: 'serverReturnedHostList',
          payload: response,
        });
      } catch (error) {
        dispatch({
          type: 'serverFailedToReturnHostList',
          payload: error,
        });
      }
    }
    if (action.type === 'userChangedUrl' && hasSelectedHost(state) !== false) {
      // If user navigated directly to a host details page, load the host list
      if (listData(state).length === 0) {
        const { page_index: pageIndex, page_size: pageSize } = uiQueryParams(state);
        try {
          const response = await coreStart.http.post('/api/endpoint/metadata', {
            body: JSON.stringify({
              paging_properties: [{ page_index: pageIndex }, { page_size: pageSize }],
            }),
          });
          response.request_page_index = Number(pageIndex);
          dispatch({
            type: 'serverReturnedHostList',
            payload: response,
          });
        } catch (error) {
          dispatch({
            type: 'serverFailedToReturnHostList',
            payload: error,
          });
          return;
        }
      }

      // call the host details api
      const { selected_host: selectedHost } = uiQueryParams(state);
      try {
        const response = await coreStart.http.get(`/api/endpoint/metadata/${selectedHost}`);
        dispatch({
          type: 'serverReturnedHostDetails',
          payload: response,
        });
      } catch (error) {
        dispatch({
          type: 'serverFailedToReturnHostDetails',
          payload: error,
        });
      }

      // call the policy response api
      try {
        const policyResponse = await coreStart.http.get(`/api/endpoint/policy_response`, {
          query: { hostId: selectedHost },
        });
        dispatch({
          type: 'serverReturnedHostPolicyResponse',
          payload: policyResponse,
        });
      } catch (error) {
        dispatch({
          type: 'serverFailedToReturnHostPolicyResponse',
          payload: error,
        });
      }

      // call the policy package api
      let endpointPackageInfo: GetPackagesResponse['response'][0] | undefined;
      try {
        const securityPackages: GetPackagesResponse = await sendGetSecurityPackages(http);
        endpointPackageInfo = securityPackages.response.find(
          (epmPackage) => epmPackage.name === 'endpoint'
        );
        if (!endpointPackageInfo) {
          throw new Error('Endpoint package was not found.');
        }
        dispatch({
          type: 'serverReturnedEndpointPackageVersion',
          payload: endpointPackageInfo.version,
        });
      } catch (error) {
        dispatch({
          type: 'serverFailedToReturnEndpointPackageVersion',
          payload: error,
        });
      }
    }
  };
};
