/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertDetailRouteType } from '../../../detections/pages/alert_details/types';
import { appendSearch } from './helpers';

export const getAlertDetailsUrl = (detailName: string, search?: string) =>
  `/alert/${detailName}/summary${appendSearch(search)}`;

export const getAlertDetailsTabUrl = (
  detailName: string,
  tabName: AlertDetailRouteType,
  search?: string
) => `/alert/${detailName}/${tabName}${appendSearch(search)}`;
