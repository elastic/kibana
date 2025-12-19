/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
interface GroupingToolbarControlsProps {
  groupingId: string;
  ruleTypeIds: string[];
  maxGroupingLevels?: number;
  services: {
    dataViews: DataViewsPublicPluginStart;
    http: HttpSetup;
    notifications: {
      toasts: ToastsStart;
    };
  };
}
export declare const GroupingToolbarControls: React.NamedExoticComponent<GroupingToolbarControlsProps>;
export {};
