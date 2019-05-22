/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { decode, encode, RisonValue } from 'rison-node';
import { Location } from 'history';
import { QueryString } from 'ui/utils/query_string';
import { hostsModel } from '../../store/hosts';
import { networkModel } from '../../store/network';
import { KqlQuery } from './types';

export const decodeRisonUrlState = (value: string | undefined): RisonValue | undefined => {
  try {
    return value ? decode(value) : undefined;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('rison decoder error')) {
      return {};
    }
    throw error;
  }
};

export const encodeRisonUrlState = (state: RisonValue) => encode(state);

export const getQueryStringFromLocation = (location: Location) => location.search.substring(1);

export const getParamFromQueryString = (queryString: string, key: string): string | undefined => {
  const queryParam = QueryString.decode(queryString)[key];
  return Array.isArray(queryParam) ? queryParam[0] : queryParam;
};

export const replaceStateKeyInQueryString = (
  stateKey: string,
  urlState: RisonValue | undefined
) => (queryString: string) => {
  const previousQueryValues = QueryString.decode(queryString);
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

export const isKqlForRoute = (pathname: string, kql: KqlQuery): boolean => {
  const trailingPath = pathname.match(/([^\/]+$)/);
  if (trailingPath !== null) {
    if (
      (trailingPath[0] === 'hosts' &&
        kql.model === 'hosts' &&
        kql.type === hostsModel.HostsType.page) ||
      (trailingPath[0] === 'network' &&
        kql.model === 'network' &&
        kql.type === networkModel.NetworkType.page) ||
      (pathname.match(/hosts\/.*?/) &&
        kql.model === 'hosts' &&
        kql.type === hostsModel.HostsType.details) ||
      (pathname.match(/network\/ip\/.*?/) &&
        kql.model === 'network' &&
        kql.type === networkModel.NetworkType.details)
    ) {
      return true;
    }
  }
  return false;
};
