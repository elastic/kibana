/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from '../../../../src/core/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { ManagementAppMountParams } from '../../../../src/plugins/management/public';

export const services = {
  I18nContext: (null as any) as CoreStart['i18n']['Context'],
  setBreadcrumbs: (null as any) as ManagementAppMountParams['setBreadcrumbs'],
  dataStart: (null as any) as DataPublicPluginStart,
};

export const setServices = (
  core: CoreStart,
  plugins: { data: DataPublicPluginStart },
  params: ManagementAppMountParams
) => {
  services.I18nContext = core.i18n.Context;
  services.setBreadcrumbs = params.setBreadcrumbs;
  services.dataStart = plugins.data;
};
