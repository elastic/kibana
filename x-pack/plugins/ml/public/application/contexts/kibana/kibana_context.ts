/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '../../../../../../../src/core/public/types';
import type { DataPublicPluginStart } from '../../../../../../../src/plugins/data/public/types';
import type { EmbeddableStart } from '../../../../../../../src/plugins/embeddable/public/plugin';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public/context/context';
import type { KibanaReactContextValue } from '../../../../../../../src/plugins/kibana_react/public/context/types';
import type { IStorageWrapper } from '../../../../../../../src/plugins/kibana_utils/public/storage/types';
import type { SharePluginStart } from '../../../../../../../src/plugins/share/public/plugin';
import type { UsageCollectionSetup } from '../../../../../../../src/plugins/usage_collection/public/plugin';
import type { DataVisualizerPluginStart } from '../../../../../data_visualizer/public/plugin';
import type { LicenseManagementUIPluginSetup } from '../../../../../license_management/public/plugin';
import type { MapsStartApi } from '../../../../../maps/public/api/start_api';
import type { SecurityPluginSetup } from '../../../../../security/public/plugin';
import type { TriggersAndActionsUIPublicPluginStart } from '../../../../../triggers_actions_ui/public/plugin';
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
}
export type StartServices = CoreStart &
  StartPlugins & {
    kibanaVersion: string;
    storage: IStorageWrapper;
  } & MlServicesContext;
export const useMlKibana = () => useKibana<StartServices>();
export type MlKibanaReactContextValue = KibanaReactContextValue<StartServices>;
