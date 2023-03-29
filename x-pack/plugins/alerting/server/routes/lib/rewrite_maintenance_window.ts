/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RewriteResponseCase } from '.';
import { MaintenanceWindow } from '../../../common';

export const rewriteMaintenanceWindowRes: RewriteResponseCase<MaintenanceWindow> = ({
  expirationDate,
  rRule,
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
  startDate,
  endDate,
  ...rest
}) => ({
  ...rest,
  expiration_date: expirationDate,
  r_rule: rRule,
  created_by: createdBy,
  updated_by: updatedBy,
  created_at: createdAt,
  updated_at: updatedAt,
  start_date: startDate,
  end_date: endDate,
});

export const rewritePartialMaintenanceBodyRes: RewriteResponseCase<Partial<MaintenanceWindow>> = ({
  expirationDate,
  rRule,
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
  startDate,
  endDate,
  ...rest
}) => ({
  ...rest,
  expiration_date: expirationDate,
  r_rule: rRule,
  created_by: createdBy,
  updated_by: updatedBy,
  created_at: createdAt,
  updated_at: updatedAt,
  start_date: startDate,
  end_date: endDate,
});
