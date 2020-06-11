/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { generatePath } from 'react-router-dom';
// eslint-disable-next-line import/no-nodejs-modules
import querystring from 'querystring';
import {
  MANAGEMENT_ROUTING_ENDPOINTS_PATH,
  MANAGEMENT_ROUTING_POLICIES_PATH,
  MANAGEMENT_ROUTING_POLICY_DETAILS_PATH,
  MANAGEMENT_ROUTING_ROOT_PATH,
} from './constants';
import { ManagementSubTab } from '../types';
import { SecurityPageName } from '../../app/types';
import { HostIndexUIQueryParams } from '../pages/endpoint_hosts/types';

// Taken from: https://github.com/microsoft/TypeScript/issues/12936#issuecomment-559034150
type ExactKeys<T1, T2> = Exclude<keyof T1, keyof T2> extends never ? T1 : never;
type Exact<T, Shape> = T extends Shape ? ExactKeys<T, Shape> : never;

/**
 * Returns a string to be used in the URL as search query params.
 * Ensures that when creating a URL query param string, that the given input strictly
 * matches the expected interface (guards against possibly leaking internal state)
 */
const querystringStringify: <ExpectedType extends object, ArgType>(
  params: Exact<ExpectedType, ArgType>
) => string = querystring.stringify;

/** Make `selected_host` required */
type EndpointDetailsUrlProps = Omit<HostIndexUIQueryParams, 'selected_host'> &
  Required<Pick<HostIndexUIQueryParams, 'selected_host'>>;

/**
 * Input props for the `getManagementUrl()` method
 */
export type GetManagementUrlProps = {
  /**
   * Exclude the URL prefix (everything to the left of where the router was mounted.
   * This may be needed when interacting with react-router (ex. to do `history.push()` or
   * validations against matched path)
   */
  excludePrefix?: boolean;
} & (
  | ({ name: 'default' | 'endpointList' } & HostIndexUIQueryParams)
  | ({ name: 'endpointDetails' | 'endpointPolicyResponse' } & EndpointDetailsUrlProps)
  | { name: 'policyList' }
  | { name: 'policyDetails'; policyId: string }
);

// Prefix is (almost) everything to the left of where the Router was mounted. In SIEM, since
// we're using Hash router, thats the `#`.
const URL_PREFIX = '#';

/**
 * Returns a URL string for a given Management page view
 * @param props
 */
export const getManagementUrl = (props: GetManagementUrlProps): string => {
  let url = props.excludePrefix ? '' : URL_PREFIX;

  if (props.name === 'default' || props.name === 'endpointList') {
    const { name, excludePrefix, ...queryParams } = props;
    const urlQueryParams = querystringStringify<HostIndexUIQueryParams, typeof queryParams>(
      queryParams
    );

    if (name === 'endpointList') {
      url += generatePath(MANAGEMENT_ROUTING_ENDPOINTS_PATH, {
        pageName: SecurityPageName.management,
        tabName: ManagementSubTab.endpoints,
      });
    } else {
      url += generatePath(MANAGEMENT_ROUTING_ROOT_PATH, {
        pageName: SecurityPageName.management,
      });
    }

    if (urlQueryParams) {
      url += `?${urlQueryParams}`;
    }
  } else if (props.name === 'endpointDetails' || props.name === 'endpointPolicyResponse') {
    const { name, excludePrefix, ...queryParams } = props;
    queryParams.show = (props.name === 'endpointPolicyResponse'
      ? 'policy_response'
      : '') as HostIndexUIQueryParams['show'];

    url += `${generatePath(MANAGEMENT_ROUTING_ENDPOINTS_PATH, {
      pageName: SecurityPageName.management,
      tabName: ManagementSubTab.endpoints,
    })}?${querystringStringify<EndpointDetailsUrlProps, typeof queryParams>(queryParams)}`;
  } else if (props.name === 'policyList') {
    url += generatePath(MANAGEMENT_ROUTING_POLICIES_PATH, {
      pageName: SecurityPageName.management,
      tabName: ManagementSubTab.policies,
    });
  } else if (props.name === 'policyDetails') {
    url += generatePath(MANAGEMENT_ROUTING_POLICY_DETAILS_PATH, {
      pageName: SecurityPageName.management,
      tabName: ManagementSubTab.policies,
      policyId: props.policyId,
    });
  }

  return url;
};
