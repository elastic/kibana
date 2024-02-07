/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PackagePolicyConfigRecord } from '@kbn/fleet-plugin/common';
import { RouteEntry } from './types';

export const getRouteEntriesFromPolicyConfig = (policyConfig: PackagePolicyConfigRecord | undefined): RouteEntry[] => {
  if (policyConfig === undefined) {
    return [];
  }
  
  const entriesString = policyConfig.route_entries?.value;
  if (entriesString && entriesString.length > 0) {
    let entries: RouteEntry[] = JSON.parse(entriesString);
    return entries;
  }

  return [];
}

export const getPolicyConfigValueFromRouteEntries = (routeEntries: RouteEntry[]): string => {
  // skip empty config rows
  var nonEmptyEntries = routeEntries.filter(entry => entry.dataId && entry.datastream);
  return JSON.stringify(nonEmptyEntries); 
}