/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointAppLocation } from '../types';

let currentLocation: EndpointAppLocation;
let fromLocation: EndpointAppLocation;

export const storeCurrentLocation = (loc: EndpointAppLocation) => {
  fromLocation = currentLocation;
  currentLocation = loc;
};

export const isOnPage = (pageRoute: EndpointAppLocation['pathname']) => {
  if (!currentLocation) {
    throw new Error('EndpointAppLocation has not been captured yet');
  }
  return currentLocation.pathname === pageRoute;
};

const wasPreviouslyOnPage = (pageRoute: EndpointAppLocation['pathname']) => {
  if (!fromLocation) {
    throw new Error('EndpointAppLocation has not been captured yet');
  }
  return fromLocation.pathname === pageRoute;
};

export const isOnPolicyPage = () => isOnPage('/policy');

export const wasPreviouslyOnPolicyPage = () => wasPreviouslyOnPage('/policy');

export const isOnHostPage = () => isOnPage('/hosts');

export const getCurrentAppLocation = () => currentLocation;

export const getFromAppLocation = () => fromLocation;
