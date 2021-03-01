/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FrontendLibs } from './lib/types';
import { compose } from './lib/compose/kibana';

import { setServices } from './kbn_services';
import { ManagementSetup } from '../../../../src/plugins/management/public';
import { SecurityPluginSetup } from '../../security/public';
import { CoreSetup } from '../../../../src/core/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { BeatsManagementConfigType } from '../common';
import { MANAGEMENT_SECTION } from '../common/constants';

async function startApp(libs: FrontendLibs, core: CoreSetup<StartDeps>) {
  const [startServices] = await Promise.all([
    core.getStartServices(),
    libs.framework.waitUntilFrameworkReady(),
  ]);

  const capabilities = startServices[0].application.capabilities;
  const hasBeatsCapability = capabilities.management.ingest?.[MANAGEMENT_SECTION] ?? false;

  if (libs.framework.licenseIsAtLeast('standard') && hasBeatsCapability) {
    const mount = async (params: any) => {
      const [coreStart, pluginsStart] = await core.getStartServices();
      setServices(coreStart, pluginsStart, params);
      const { renderApp } = await import('./application');
      return renderApp(params, libs);
    };

    libs.framework.registerManagementUI(mount);
  }
}

interface SetupDeps {
  management: ManagementSetup;
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
}

interface StartDeps {
  data: DataPublicPluginStart;
}

export const bootstrap = (
  core: CoreSetup<StartDeps>,
  plugins: SetupDeps,
  config: BeatsManagementConfigType,
  version: string
) => {
  startApp(
    compose({
      core,
      config,
      version,
      ...plugins,
    }),
    core
  );
};
