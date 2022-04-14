/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const APM_SERVICE_GROUP_SAVED_OBJECT_TYPE = 'apm-service-group';
export const SERVICE_GROUP_COLOR_DEFAULT = '#D1DAE7';
export const MAX_NUMBER_OF_SERVICES_IN_GROUP = 500;

export interface ServiceGroup {
  groupName: string;
  kuery: string;
  description?: string;
  serviceNames: string[];
  color?: string;
}

export interface SavedServiceGroup extends ServiceGroup {
  id: string;
  updatedAt: number;
}
