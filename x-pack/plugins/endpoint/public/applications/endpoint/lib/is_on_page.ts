/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointAppLocation } from '../types';

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

export const isOnAlertPage = () => isOnPage('/alerts');

export const getCurrentAppLocation = () => currentLocation;
