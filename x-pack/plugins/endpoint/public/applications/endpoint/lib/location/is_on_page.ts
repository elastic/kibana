/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointAppLocation, EndpointAppMatch } from '../../types';

let currentLocation: EndpointAppLocation;
let fromLocation: EndpointAppLocation;
let currentMatch: EndpointAppMatch;
let previousMatch: EndpointAppMatch;

export const storeCurrentLocation = (loc: EndpointAppLocation) => {
  fromLocation = currentLocation;
  currentLocation = loc;
};

export const storeCurrentMatch = (mat: EndpointAppMatch) => {
  previousMatch = currentMatch;
  currentMatch = mat;
};

export const isOnPage = (pageRoute: EndpointAppLocation['pathname']) => {
  if (!currentLocation) {
    throw new Error('EndpointAppLocation has not been captured yet');
  }
  return currentLocation.pathname === pageRoute;
};

export const isOnMatchPage = (routePath: EndpointAppMatch['path']) => {
  if (!currentMatch) {
    throw new Error('EndpointAppMatch has not been captured yet');
  }
  return currentMatch.path === routePath;
};

export const wasPreviouslyOnMatchPage = (routePath: EndpointAppMatch['path']) => {
  if (!previousMatch) {
    throw new Error('EndpointAppMatch has not been captured yet');
  }
  return previousMatch.path === routePath;
};

export const isOnDetailsPage = (pageBaseRoute: EndpointAppLocation['pathname']) => {
  if (!currentLocation) {
    throw new Error('EndpointAppLocation has not been captured yet');
  }
  const pathnameParts = currentLocation.pathname.split('/');
  return pathnameParts[1] === pageBaseRoute.split('/')[1] && pathnameParts[2];
};

export const wasPreviouslyOnPage = (pageRoute: EndpointAppLocation['pathname']) => {
  if (!fromLocation) {
    throw new Error('EndpointAppLocation has not been captured yet');
  }
  return fromLocation.pathname === pageRoute;
};

export const wasPreviouslyOnDetailsPage = (pageBaseRoute: EndpointAppLocation['pathname']) => {
  if (!fromLocation) {
    throw new Error('EndpointAppLocation has not been captured yet');
  }
  const pathnameParts = fromLocation.pathname.split('/');
  return pathnameParts[1] === pageBaseRoute.split('/')[1] && pathnameParts[2];
};

export const detailsIdFromParams = () => {
  if (currentLocation) {
    return currentLocation.pathname.split('/')[2];
  }
  return '';
};

export const getCurrentAppLocation = () => currentLocation;

export const getFromAppLocation = () => fromLocation;

export const getCurrentAppMatch = () => match;
