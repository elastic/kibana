/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineTabs } from '../timeline';

type EmptyObject = Record<string | number, never>;

export type ExpandedEventType =
  | {
      panelView?: 'eventDetail';
      params?: {
        eventId: string;
        indexName: string;
        refetch?: () => void;
      };
    }
  | EmptyObject;

export type ExpandedDetailType = ExpandedEventType;

export type ExpandedDetailTimeline = {
  [tab in TimelineTabs]?: ExpandedDetailType;
};

export type ExpandedDetail = Partial<Record<string, ExpandedDetailType>>;
