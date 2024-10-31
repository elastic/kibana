/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

export enum DocumentEventTypes {
  DetailsFlyoutOpened = 'Details Flyout Opened',
  DetailsFlyoutTabClicked = 'Details Flyout Tabs Clicked',
}

interface ReportDetailsFlyoutOpenedParams {
  location: string;
  panel: 'left' | 'right' | 'preview';
}

interface ReportDetailsFlyoutTabClickedParams {
  location: string;
  panel: 'left' | 'right';
  tabId: string;
}

export type DocumentEventTypeData = {
  [K in DocumentEventTypes]: K extends DocumentEventTypes.DetailsFlyoutOpened
    ? ReportDetailsFlyoutOpenedParams
    : K extends DocumentEventTypes.DetailsFlyoutTabClicked
    ? ReportDetailsFlyoutTabClickedParams
    : never;
};

export type DocumentDetailsTelemetryEvents =
  | {
      eventType: DocumentEventTypes.DetailsFlyoutOpened;
      schema: RootSchema<ReportDetailsFlyoutOpenedParams>;
    }
  | {
      eventType: DocumentEventTypes.DetailsFlyoutTabClicked;
      schema: RootSchema<ReportDetailsFlyoutTabClickedParams>;
    };
