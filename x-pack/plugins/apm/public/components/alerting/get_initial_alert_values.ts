/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertType, ALERT_TYPES_CONFIG } from '../../../common/alert_types';

export function getInitialAlertValues(
  alertType: AlertType | null,
  serviceName: string | undefined
) {
  const alertTypeName = alertType
    ? ALERT_TYPES_CONFIG[alertType].name
    : undefined;
  const alertName = alertTypeName
    ? serviceName
      ? `${alertTypeName} | ${serviceName}`
      : alertTypeName
    : undefined;
  const tags = ['apm'];
  if (serviceName) {
    tags.push(`service.name:${serviceName}`.toLowerCase());
  }

  return {
    tags,
    ...(alertName ? { name: alertName } : {}),
  };
}
