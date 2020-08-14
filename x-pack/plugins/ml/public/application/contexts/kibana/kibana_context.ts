/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataPublicPluginStart } from 'src/plugins/data/public';
import { CoreStart } from 'kibana/public';
import {
  useKibana,
  KibanaReactContextValue,
} from '../../../../../../../src/plugins/kibana_react/public';
import { SecurityPluginSetup } from '../../../../../security/public';
import { LicenseManagementUIPluginSetup } from '../../../../../license_management/public';
import { SharePluginStart } from '../../../../../../../src/plugins/share/public';
import { MlServicesContext } from '../../app';

interface StartPlugins {
  data: DataPublicPluginStart;
  security?: SecurityPluginSetup;
  licenseManagement?: LicenseManagementUIPluginSetup;
  share: SharePluginStart;
}
export type StartServices = CoreStart &
  StartPlugins & { kibanaVersion: string } & MlServicesContext;
export const useMlKibana = () => useKibana<StartServices>();
export type MlKibanaReactContextValue = KibanaReactContextValue<StartServices>;
