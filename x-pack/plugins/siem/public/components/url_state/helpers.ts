/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { decode, encode, RisonValue } from 'rison-node';
import { Location } from 'history';
import { QueryString } from 'ui/utils/query_string';
import { KqlQuery, LocationTypes } from './types';
import { CONSTANTS } from './constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const decodeRisonUrlState = (value: string | undefined): RisonValue | any | undefined => {
  try {
    return value ? decode(value) : undefined;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('rison decoder error')) {
      return {};
    }
    throw error;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const encodeRisonUrlState = (state: any) => encode(state);

export const getQueryStringFromLocation = (location: Location) => location.search.substring(1);

export const getParamFromQueryString = (queryString: string, key: string): string | undefined => {
  const queryParam = QueryString.decode(queryString)[key];
  return Array.isArray(queryParam) ? queryParam[0] : queryParam;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const replaceStateKeyInQueryString = <UrlState extends any>(
  stateKey: string,
  urlState: UrlState | undefined
) => (queryString: string) => {
  const previousQueryValues = QueryString.decode(queryString);
  // ಠ_ಠ Code was copied from x-pack/plugins/infra/public/utils/url_state.tsx ಠ_ಠ
  // Remove this if these utilities are promoted to kibana core
  const encodedUrlState =
    typeof urlState !== 'undefined' ? encodeRisonUrlState(urlState) : undefined;
  return QueryString.encode({
    ...previousQueryValues,
    [stateKey]: encodedUrlState,
  });
};

export const replaceQueryStringInLocation = (location: Location, queryString: string): Location => {
  if (queryString === getQueryStringFromLocation(location)) {
    return location;
  } else {
    return {
      ...location,
      search: `?${queryString}`,
    };
  }
};

export const getCurrentLocation = (pathname: string): LocationTypes | null => {
  const trailingPath = pathname.match(/([^\/]+$)/);
  if (trailingPath !== null) {
    if (trailingPath[0] === 'hosts') {
      return CONSTANTS.hostsPage;
    }
    if (trailingPath[0] === 'network') {
      return CONSTANTS.networkPage;
    }
    if (pathname.match(/hosts\/.*?/)) {
      return CONSTANTS.hostsDetails;
    }
    if (pathname.match(/network\/ip\/.*?/)) {
      return CONSTANTS.networkDetails;
    }
  }
  return null;
};

export const isKqlForRoute = (pathname: string, kql: KqlQuery): boolean => {
  const currentLocation = getCurrentLocation(pathname);
  if (
    (currentLocation === CONSTANTS.hostsPage && kql.queryLocation === CONSTANTS.hostsPage) ||
    (currentLocation === CONSTANTS.networkPage && kql.queryLocation === CONSTANTS.networkPage) ||
    (currentLocation === CONSTANTS.hostsDetails && kql.queryLocation === CONSTANTS.hostsDetails) ||
    (currentLocation === CONSTANTS.networkDetails && kql.queryLocation === CONSTANTS.networkDetails)
  ) {
    return true;
  }
  return false;
};
