/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { useKibana, KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import type { SecurityPluginSetup } from '@kbn/security-plugin/public';
import type { LicenseManagementUIPluginSetup } from '@kbn/license-management-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { MapsStartApi } from '@kbn/maps-plugin/public';
import type { DataVisualizerPluginStart } from '@kbn/data-visualizer-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import type { DashboardSetup } from '@kbn/dashboard-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { MlServicesContext } from '../../app';

interface StartPlugins {
  data: DataPublicPluginStart;
  security?: SecurityPluginSetup;
  licenseManagement?: LicenseManagementUIPluginSetup;
  share: SharePluginStart;
  embeddable: EmbeddableStart;
  maps?: MapsStartApi;
  triggersActionsUi?: TriggersAndActionsUIPublicPluginStart;
  dataVisualizer?: DataVisualizerPluginStart;
  usageCollection?: UsageCollectionSetup;
  fieldFormats: FieldFormatsRegistry;
  dashboard: DashboardSetup;
  spacesApi: SpacesPluginStart;
  charts?: ChartsPluginStart;
}
export type StartServices = CoreStart &
  StartPlugins & {
    kibanaVersion: string;
    storage: IStorageWrapper;
  } & MlServicesContext;
export const useMlKibana = () => useKibana<StartServices>();
export type MlKibanaReactContextValue = KibanaReactContextValue<StartServices>;
