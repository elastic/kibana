/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlCapabilitiesResponse } from '@kbn/ml-plugin/common/types/capabilities';

export const hasMlAdminPermissions = (capabilities: MlCapabilitiesResponse): boolean =>
  getDataFeedPermissions(capabilities) &&
  getJobPermissions(capabilities) &&
  getFilterPermissions(capabilities) &&
  getCalendarPermissions(capabilities);

const getDataFeedPermissions = ({ capabilities }: MlCapabilitiesResponse): boolean =>
  capabilities.canGetDatafeeds &&
  capabilities.canStartStopDatafeed &&
  capabilities.canUpdateDatafeed &&
  capabilities.canPreviewDatafeed;

const getJobPermissions = ({ capabilities }: MlCapabilitiesResponse): boolean =>
  capabilities.canCreateJob &&
  capabilities.canGetJobs &&
  capabilities.canUpdateJob &&
  capabilities.canDeleteJob &&
  capabilities.canOpenJob &&
  capabilities.canCloseJob &&
  capabilities.canForecastJob;

const getFilterPermissions = ({ capabilities }: MlCapabilitiesResponse) =>
  capabilities.canGetFilters && capabilities.canCreateFilter && capabilities.canDeleteFilter;

const getCalendarPermissions = ({ capabilities }: MlCapabilitiesResponse) =>
  capabilities.canCreateCalendar && capabilities.canGetCalendars && capabilities.canDeleteCalendar;
