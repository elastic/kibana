/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { ExportTypesRegistry } from './export_types_registry';
import { ReportingPublicPlugin } from './plugin';
import type { ReportingPublicComponents } from './shared/get_shared_components';

/**
 * Setup contract for the Reporting plugin.
 */
export interface ReportingSetup {
  /**
   * Used to inform plugins if Reporting config is compatible with UI Capabilities / Application Sub-Feature Controls
   *
   * @returns boolean
   */
  usesUiCapabilities: () => boolean;

  /**
   * A set of React components for displaying a Reporting share menu in an application
   */
  components: ReportingPublicComponents;

  /**
   * Used to control UI for plugins that have reporting for PNG/PDF/CSV
   */
  registerExportType: ExportTypesRegistry['setup']['register'];
}

/**
 * Start contract for the Reporting plugin.
 */
export type ReportingStart = ReportingSetup;

/**
 * Public interface needed for shared components
 */
export type { ApplicationProps } from './shared';
export type { ReportingPublicComponents };

/**
 * @internal
 *
 * @param {PluginInitializerContext} initializerContext
 * @returns {ReportingPublicPlugin}
 */
export function plugin(initializerContext: PluginInitializerContext): ReportingPublicPlugin {
  return new ReportingPublicPlugin(initializerContext);
}
