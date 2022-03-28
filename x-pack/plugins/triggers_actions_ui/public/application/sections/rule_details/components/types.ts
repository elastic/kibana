/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AlertListItemStatus {
  label: string;
  healthColor: string;
  actionGroup?: string;
}

export interface AlertListItem {
  alert: string;
  status: AlertListItemStatus;
  start?: Date;
  duration: number;
  isMuted: boolean;
  sortPriority: number;
}
