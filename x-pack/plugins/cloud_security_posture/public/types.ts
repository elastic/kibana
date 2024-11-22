/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { ComponentType, ReactNode } from 'react';
import { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import type { DataPublicPluginSetup } from '@kbn/data-plugin/public';
import { CoreStart } from '@kbn/core/public';
import type { FleetSetup } from '@kbn/fleet-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
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

export type CloudSecurityPostureStartServices = Pick<
  CoreStart,
  'notifications' | 'analytics' | 'i18n' | 'theme'
>;
