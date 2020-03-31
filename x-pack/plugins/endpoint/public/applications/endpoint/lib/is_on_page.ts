/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import querystring from 'querystring';
import { EndpointAppLocation, HostIndexUIQueryParams, AlertingIndexUIQueryParams } from '../types';

let currentLocation: EndpointAppLocation;

export const storeCurrentLocation = (loc: EndpointAppLocation) => (currentLocation = loc);

export const isOnPage = (pageRoute: EndpointAppLocation['pathname']) => {
  if (!currentLocation) {
    throw new Error('EndpointAppLocation has not been captured yet');
  }
  return currentLocation.pathname === pageRoute;
};

export const isOnPolicyPage = () => isOnPage('/policy');

export const isOnHostPage = () => isOnPage('/hosts');

type EndpointParams = HostIndexUIQueryParams | AlertingIndexUIQueryParams;

export const uiQueryParams = <K extends typeof EndpointParams>() => {
  const data: HostIndexUIQueryParams = {};

  if (!currentLocation) {
    throw new Error('EndpointAppLocation has not been captured yet');
  }

  const query = querystring.parse(currentLocation.search.slice(1));

  const keys: Array<keyof K> = ['selected_host'];

  for (const key of keys) {
    const value = query[key];
    if (typeof value === 'string') {
      data[key] = value;
    } else if (Array.isArray(value)) {
      data[key] = value[value.length - 1];
    }
  }

  return data;
};

export const hasSelectedHost = () => {
  return uiQueryParams().selected_host !== undefined;
};

export const isOnAlertPage = () => isOnPage('/alerts');

export const getCurrentAppLocation = () => currentLocation;
