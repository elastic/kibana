/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';

export interface PageHeaderProps {
  alert: EcsFieldsResponse;
}

export interface AlertDetailsPathParams {
  alertId: string;
  ruleId: string;
}

export const ALERT_DETAILS_PAGE_ID = 'alert-details-o11y';
