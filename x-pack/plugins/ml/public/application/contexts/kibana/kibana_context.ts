/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from 'src/plugins/data/public';
import type { CoreStart } from 'kibana/public';
import type { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import {
  useKibana,
  KibanaReactContextValue,
} from '../../../../../../../src/plugins/kibana_react/public';
import type { SecurityPluginSetup } from '../../../../../security/public';
import type { LicenseManagementUIPluginSetup } from '../../../../../license_management/public';
import type { SharePluginStart } from '../../../../../../../src/plugins/share/public';
import type { MlServicesContext } from '../../app';
import type { IStorageWrapper } from '../../../../../../../src/plugins/kibana_utils/public';
import type { EmbeddableStart } from '../../../../../../../src/plugins/embeddable/public';
import type { MapsStartApi } from '../../../../../maps/public';
import type { DataVisualizerPluginStart } from '../../../../../data_visualizer/public';
import type { TriggersAndActionsUIPublicPluginStart } from '../../../../../triggers_actions_ui/public';
import type { FieldFormatsRegistry } from '../../../../../../../src/plugins/field_formats/common';
import type { DashboardSetup } from '../../../../../../../src/plugins/dashboard/public';
import type { SpacesPluginStart } from '../../../../../spaces/public';
import type { ChartsPluginStart } from '../../../../../../../src/plugins/charts/public';

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
