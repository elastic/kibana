/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { ComponentType, ReactNode } from 'react';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import { ToastsStart } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { FleetSetup, FleetStart } from '@kbn/fleet-plugin/public';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import type { CspRouterProps } from './application/csp_router';
import type { CloudSecurityPosturePageId } from './common/navigation/types';

/**
 * The cloud security posture's public plugin setup interface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CspClientPluginSetup {}

/**
 * The cloud security posture's public plugin start interface.
 */
export interface CspClientPluginStart {
  /** Gets the cloud security posture router component for embedding in the security solution. */
  getCloudSecurityPostureRouter(): ComponentType<CspRouterProps>;
}

export interface CspClientPluginSetupDeps {
  // required
  data: DataPublicPluginSetup;
  fleet: FleetSetup;
  cloud: CloudSetup;
  uiActions: UiActionsSetup;
  // optional
  usageCollection?: UsageCollectionSetup;
}

export interface CspClientPluginStartDeps {
  // required
  data: DataPublicPluginStart;
  dataViews: DataViewsServicePublic;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  uiActions: UiActionsStart;
  fieldFormats: FieldFormatsStart;
  toastNotifications: ToastsStart;
  charts: ChartsPluginStart;
  discover: DiscoverStart;
  fleet: FleetStart;
  licensing: LicensingPluginStart;
  share: SharePluginStart;
  storage: Storage;

  // optional
  usageCollection?: UsageCollectionStart;
}

/**
 * Methods exposed from the security solution to the cloud security posture application.
 */
export interface CspSecuritySolutionContext {
  /** Gets the `FiltersGlobal` component for embedding a filter bar in the security solution application. */
  getFiltersGlobalComponent: () => ComponentType<{ children: ReactNode }>;
  /** Gets the `SpyRoute` component for navigation highlighting and breadcrumbs. */
  getSpyRouteComponent: () => ComponentType<{
    pageName: CloudSecurityPosturePageId;
    state?: Record<string, string | undefined>;
  }>;
}
