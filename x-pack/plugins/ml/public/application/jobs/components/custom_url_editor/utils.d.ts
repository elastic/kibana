/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewListItem } from '@kbn/data-views-plugin/common';
import { UrlConfig } from '../../../../../common/types/custom_urls';
import { Job } from '../../../../../common/types/anomaly_detection_jobs';
import { TimeRangeType } from './constants';

export interface TimeRange {
  type: TimeRangeType;
  interval: string;
}

export interface CustomUrlSettings {
  label: string;
  type: string;
  // Note timeRange is only editable in new URLs for Dashboard and Discover URLs,
  // as for other URLs we have no way of knowing how the field will be used in the URL.
  timeRange: TimeRange;
  kibanaSettings?: {
    dashboardId?: string;
    queryFieldNames?: string[];
    discoverIndexPatternId?: string;
  };
  otherUrlSettings?: {
    urlValue: string;
  };
}

export function getTestUrl(job: Job, customUrl: UrlConfig): Promise<string>;

export function isValidCustomUrlSettingsTimeRange(timeRangeSettings: unknown): boolean;

export function getNewCustomUrlDefaults(
  job: Job,
  dashboards: Array<{ id: string; title: string }>,
  dataViews: DataViewListItem[]
): CustomUrlSettings;
export function getQueryEntityFieldNames(job: Job): string[];
export function isValidCustomUrlSettings(
  settings: CustomUrlSettings,
  savedCustomUrls: UrlConfig[]
): boolean;
export function buildCustomUrlFromSettings(settings: CustomUrlSettings): Promise<UrlConfig>;
