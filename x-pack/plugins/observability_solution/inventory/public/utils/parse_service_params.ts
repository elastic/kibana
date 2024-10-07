/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceOverviewParams } from '@kbn/observability-shared-plugin/common';

/**
 * Parses a displayName string with the format `service.name:service.environment`,
 * returning a valid `ServiceOverviewParams` object.
 * @param displayName A string from a `entity.displayName` field.
 * @returns
 */
export const parseServiceParams = (displayName: string): ServiceOverviewParams => {
  const separatorIndex = displayName.indexOf(':');

  const hasEnvironmentName = separatorIndex !== -1;

  const serviceName = hasEnvironmentName ? displayName.slice(0, separatorIndex) : displayName;
  // Exclude the separator from the sliced string for the environment name.
  // If the string is empty however, then we default to undefined.
  const environment = (hasEnvironmentName && displayName.slice(separatorIndex + 1)) || undefined;

  return {
    serviceName,
    environment,
  };
};
