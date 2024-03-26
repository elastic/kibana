/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/analytics-client';
import type { TelemetryEventTypes } from '../../constants';

export interface ReportDetailsFlyoutOpenedParams {
  tableId: string;
  panel: 'left' | 'right' | 'preview';
}

export interface ReportDetailsFlyoutTabClickedParams {
  tableId: string;
  panel: 'left' | 'right';
  tabId: string;
}

export type ReportDocumentDetailsTelemetryEventParams =
  | ReportDetailsFlyoutOpenedParams
  | ReportDetailsFlyoutTabClickedParams;

export type DocumentDetailsTelemetryEvents =
  | {
      eventType: TelemetryEventTypes.DetailsFlyoutOpened;
      schema: RootSchema<ReportDetailsFlyoutOpenedParams>;
    }
  | {
      eventType: TelemetryEventTypes.DetailsFlyoutTabClicked;
      schema: RootSchema<ReportDetailsFlyoutTabClickedParams>;
    };
