/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
// FIXME: Remove references to `querystring`
// eslint-disable-next-line import/no-nodejs-modules
import querystring from 'querystring';
import { generatePath } from 'react-router-dom';
import { appendSearch } from '../../common/components/link_to/helpers';
import { ArtifactListPageUrlParams } from '../components/artifact_list_page';
import { paginationFromUrlParams } from '../components/hooks/use_url_pagination';
import { EndpointIndexUIQueryParams } from '../pages/endpoint_hosts/types';
import { EventFiltersPageLocation } from '../pages/event_filters/types';
import { PolicyDetailsArtifactsPageLocation } from '../pages/policy/types';
import { AdministrationSubTab } from '../types';
import {
  MANAGEMENT_DEFAULT_PAGE,
  MANAGEMENT_DEFAULT_PAGE_SIZE,
  MANAGEMENT_PAGE_SIZE_OPTIONS,
  MANAGEMENT_ROUTING_BLOCKLIST_PATH,
  MANAGEMENT_ROUTING_ENDPOINTS_PATH,
  MANAGEMENT_ROUTING_EVENT_FILTERS_PATH,
  MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH,
  MANAGEMENT_ROUTING_POLICIES_PATH,
  MANAGEMENT_ROUTING_POLICY_DETAILS_BLOCKLISTS_PATH,
  MANAGEMENT_ROUTING_POLICY_DETAILS_EVENT_FILTERS_PATH,
  MANAGEMENT_ROUTING_POLICY_DETAILS_FORM_PATH,
  MANAGEMENT_ROUTING_POLICY_DETAILS_HOST_ISOLATION_EXCEPTIONS_PATH,
  MANAGEMENT_ROUTING_POLICY_DETAILS_TRUSTED_APPS_PATH,
  MANAGEMENT_ROUTING_TRUSTED_APPS_PATH,
} from './constants';
import { isDefaultOrMissing, getArtifactListPageUrlPath } from './url_routing';

// Taken from: https://github.com/microsoft/TypeScript/issues/12936#issuecomment-559034150
type ExactKeys<T1, T2> = Exclude<keyof T1, keyof T2> extends never ? T1 : never;
type Exact<T, Shape> = T extends Shape ? ExactKeys<T, Shape> : never;

/**
 * Returns a string to be used in the URL as search query params.
 * Ensures that when creating a URL query param string, that the given input strictly
 * matches the expected interface (guards against possibly leaking internal state)
 */
const querystringStringify = <ExpectedType, ArgType>(
  params: Exact<ExpectedType, ArgType>
): string => querystring.stringify(params as unknown as querystring.ParsedUrlQueryInput);

/** Make `selected_endpoint` required */
type EndpointDetailsUrlProps = Omit<EndpointIndexUIQueryParams, 'selected_endpoint'> &
  Required<Pick<EndpointIndexUIQueryParams, 'selected_endpoint'>>;

/** URL search params that are only applicable to the list page */
type EndpointListUrlProps = Omit<EndpointIndexUIQueryParams, 'selected_endpoint' | 'show'>;

export const getEndpointListPath = (
  props: { name: 'default' | 'endpointList' } & EndpointListUrlProps,
  search?: string
) => {
  const { name, ...queryParams } = props;
  const urlQueryParams = querystringStringify<EndpointListUrlProps, typeof queryParams>(
    queryParams
  );
  const urlSearch = `${urlQueryParams && !isEmpty(search) ? '&' : ''}${search ?? ''}`;

  if (name === 'endpointList') {
    return `${generatePath(MANAGEMENT_ROUTING_ENDPOINTS_PATH, {
      tabName: AdministrationSubTab.endpoints,
    })}${appendSearch(`${urlQueryParams ? `${urlQueryParams}${urlSearch}` : urlSearch}`)}`;
  }
  return `${appendSearch(`${urlQueryParams ? `${urlQueryParams}${urlSearch}` : urlSearch}`)}`;
};

export const getEndpointDetailsPath = (
  props: {
    name:
      | 'endpointDetails'
      | 'endpointPolicyResponse'
      | 'endpointIsolate'
      | 'endpointUnIsolate'
      | 'endpointActivityLog';
  } & EndpointIndexUIQueryParams &
    EndpointDetailsUrlProps,
  search?: string
) => {
  const { name, show, ...rest } = props;

  const queryParams: EndpointDetailsUrlProps = { ...rest };

  switch (props.name) {
    case 'endpointDetails':
      queryParams.show = 'details';
      break;
    case 'endpointIsolate':
      queryParams.show = 'isolate';
      break;
    case 'endpointUnIsolate':
      queryParams.show = 'unisolate';
      break;
    case 'endpointPolicyResponse':
      queryParams.show = 'policy_response';
      break;
    case 'endpointActivityLog':
      queryParams.show = 'activity_log';
      break;
  }

  const urlQueryParams = querystringStringify<EndpointDetailsUrlProps, typeof queryParams>(
    queryParams
  );
  const urlSearch = `${urlQueryParams && !isEmpty(search) ? '&' : ''}${search ?? ''}`;

  return `${generatePath(MANAGEMENT_ROUTING_ENDPOINTS_PATH, {
    tabName: AdministrationSubTab.endpoints,
  })}${appendSearch(`${urlQueryParams ? `${urlQueryParams}${urlSearch}` : urlSearch}`)}`;
};

export const getPoliciesPath = (search?: string) => {
  return `${generatePath(MANAGEMENT_ROUTING_POLICIES_PATH, {
    tabName: AdministrationSubTab.policies,
  })}${appendSearch(search)}`;
};

export const getPolicyDetailPath = (policyId: string, search?: string) => {
  return `${generatePath(MANAGEMENT_ROUTING_POLICY_DETAILS_FORM_PATH, {
    tabName: AdministrationSubTab.policies,
    policyId,
  })}${appendSearch(search)}`;
};

export const getPolicyTrustedAppsPath = (policyId: string, search?: string) => {
  return `${generatePath(MANAGEMENT_ROUTING_POLICY_DETAILS_TRUSTED_APPS_PATH, {
    tabName: AdministrationSubTab.policies,
    policyId,
  })}${appendSearch(search)}`;
};

export const getPolicyEventFiltersPath = (
  policyId: string,
  location?: Partial<PolicyDetailsArtifactsPageLocation>
) => {
  return `${generatePath(MANAGEMENT_ROUTING_POLICY_DETAILS_EVENT_FILTERS_PATH, {
    tabName: AdministrationSubTab.policies,
    policyId,
  })}${appendSearch(
    querystring.stringify(normalizePolicyDetailsArtifactsListPageLocation(location))
  )}`;
};

const normalizePolicyDetailsArtifactsListPageLocation = (
  location?: Partial<PolicyDetailsArtifactsPageLocation>
): Partial<PolicyDetailsArtifactsPageLocation> => {
  if (location) {
    return {
      ...(!isDefaultOrMissing(location.page, MANAGEMENT_DEFAULT_PAGE + 1)
        ? { page: location.page }
        : {}),
      ...(!isDefaultOrMissing(location.pageSize, MANAGEMENT_DEFAULT_PAGE_SIZE)
        ? { pageSize: location.pageSize }
        : {}),
      ...(!isDefaultOrMissing(location.show, undefined) ? { show: location.show } : {}),
      ...(!isDefaultOrMissing(location.filter, '') ? { filter: location.filter } : ''),
    };
  } else {
    return {};
  }
};

const normalizeEventFiltersPageLocation = (
  location?: Partial<EventFiltersPageLocation>
): Partial<EventFiltersPageLocation> => {
  if (location) {
    return {
      ...(!isDefaultOrMissing(location.page_index, MANAGEMENT_DEFAULT_PAGE)
        ? { page_index: location.page_index }
        : {}),
      ...(!isDefaultOrMissing(location.page_size, MANAGEMENT_DEFAULT_PAGE_SIZE)
        ? { page_size: location.page_size }
        : {}),
      ...(!isDefaultOrMissing(location.show, undefined) ? { show: location.show } : {}),
      ...(!isDefaultOrMissing(location.id, undefined) ? { id: location.id } : {}),
      ...(!isDefaultOrMissing(location.filter, '') ? { filter: location.filter } : ''),
      ...(!isDefaultOrMissing(location.included_policies, '')
        ? { included_policies: location.included_policies }
        : ''),
    };
  } else {
    return {};
  }
};

/**
 * Given an object with url params, and a given key, return back only the first param value (case multiples were defined)
 * @param query
 * @param key
 */
export const extractFirstParamValue = (
  query: querystring.ParsedUrlQuery,
  key: string
): string | undefined => {
  const value = query[key];

  return Array.isArray(value) ? value[value.length - 1] : value;
};

const extractPageIndex = (query: querystring.ParsedUrlQuery): number => {
  const pageIndex = Number(extractFirstParamValue(query, 'page_index'));

  return !Number.isFinite(pageIndex) || pageIndex < 0 ? MANAGEMENT_DEFAULT_PAGE : pageIndex;
};

const extractPageSize = (query: querystring.ParsedUrlQuery): number => {
  const pageSize = Number(extractFirstParamValue(query, 'page_size'));

  return MANAGEMENT_PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : MANAGEMENT_DEFAULT_PAGE_SIZE;
};

const extractFilter = (query: querystring.ParsedUrlQuery): string => {
  return extractFirstParamValue(query, 'filter') || '';
};

const extractIncludedPolicies = (query: querystring.ParsedUrlQuery): string => {
  return extractFirstParamValue(query, 'included_policies') || '';
};

export const extractListPaginationParams = (query: querystring.ParsedUrlQuery) => ({
  page_index: extractPageIndex(query),
  page_size: extractPageSize(query),
  filter: extractFilter(query),
});

export const extractTrustedAppsListPaginationParams = (query: querystring.ParsedUrlQuery) => ({
  ...extractListPaginationParams(query),
  included_policies: extractIncludedPolicies(query),
});

export const extractArtifactsListPaginationParams = (query: querystring.ParsedUrlQuery) => ({
  ...extractListPaginationParams(query),
  included_policies: extractIncludedPolicies(query),
});

export const getTrustedAppsListPath = (location?: Partial<ArtifactListPageUrlParams>): string => {
  const path = generatePath(MANAGEMENT_ROUTING_TRUSTED_APPS_PATH, {
    tabName: AdministrationSubTab.trustedApps,
  });

  return getArtifactListPageUrlPath(path, location);
};

export const extractPolicyDetailsArtifactsListPageLocation = (
  query: querystring.ParsedUrlQuery
): PolicyDetailsArtifactsPageLocation => {
  const showParamValue = extractFirstParamValue(
    query,
    'show'
  ) as PolicyDetailsArtifactsPageLocation['show'];
  const pagination = paginationFromUrlParams(query);
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    filter: query.filter as string,
    show: showParamValue && 'list' === showParamValue ? showParamValue : undefined,
  };
};

export const getPolicyDetailsArtifactsListPath = (
  policyId: string,
  location?: Partial<PolicyDetailsArtifactsPageLocation>
): string => {
  const path = generatePath(MANAGEMENT_ROUTING_POLICY_DETAILS_TRUSTED_APPS_PATH, {
    tabName: AdministrationSubTab.policies,
    policyId,
  });

  return `${path}${appendSearch(
    querystring.stringify(normalizePolicyDetailsArtifactsListPageLocation(location))
  )}`;
};

export const extractEventFiltersPageLocation = (
  query: querystring.ParsedUrlQuery
): EventFiltersPageLocation => {
  const showParamValue = extractFirstParamValue(query, 'show') as EventFiltersPageLocation['show'];

  return {
    ...extractArtifactsListPaginationParams(query),
    show:
      showParamValue && ['edit', 'create'].includes(showParamValue) ? showParamValue : undefined,
    id: extractFirstParamValue(query, 'id'),
  };
};

export const getEventFiltersListPath = (location?: Partial<EventFiltersPageLocation>): string => {
  const path = generatePath(MANAGEMENT_ROUTING_EVENT_FILTERS_PATH, {
    tabName: AdministrationSubTab.eventFilters,
  });

  return `${path}${appendSearch(
    querystring.stringify(normalizeEventFiltersPageLocation(location))
  )}`;
};

export const getHostIsolationExceptionsListPath = (
  location?: Partial<ArtifactListPageUrlParams>
): string => {
  const path = generatePath(MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH, {
    tabName: AdministrationSubTab.hostIsolationExceptions,
  });

  return getArtifactListPageUrlPath(path, location);
};

export const getPolicyHostIsolationExceptionsPath = (
  policyId: string,
  location?: Partial<PolicyDetailsArtifactsPageLocation>
) => {
  const path = generatePath(MANAGEMENT_ROUTING_POLICY_DETAILS_HOST_ISOLATION_EXCEPTIONS_PATH, {
    tabName: AdministrationSubTab.policies,
    policyId,
  });
  return `${path}${appendSearch(
    querystring.stringify(normalizePolicyDetailsArtifactsListPageLocation(location))
  )}`;
};

export const getBlocklistsListPath = (location?: Partial<ArtifactListPageUrlParams>): string => {
  const path = generatePath(MANAGEMENT_ROUTING_BLOCKLIST_PATH, {
    tabName: AdministrationSubTab.blocklist,
  });

  return getArtifactListPageUrlPath(path, location);
};

export const getPolicyBlocklistsPath = (
  policyId: string,
  location?: Partial<PolicyDetailsArtifactsPageLocation>
) => {
  const path = generatePath(MANAGEMENT_ROUTING_POLICY_DETAILS_BLOCKLISTS_PATH, {
    tabName: AdministrationSubTab.policies,
    policyId,
  });
  return `${path}${appendSearch(
    querystring.stringify(normalizePolicyDetailsArtifactsListPageLocation(location))
  )}`;
};
