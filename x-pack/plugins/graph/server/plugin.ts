/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'src/core/server';
import { LicensingPluginSetup } from '../../licensing/common/types';
import { LicenseState } from './lib/license_state';
import { registerSearchRoute } from './routes/search';
import { registerExploreRoute } from './routes/explore';

export class GraphPlugin implements Plugin {
  private licenseState: LicenseState | null = null;

  public async setup(core: CoreSetup, { licensing }: { licensing: LicensingPluginSetup }) {
    const licenseState = new LicenseState();
    licenseState.start(licensing.license$);
    this.licenseState = licenseState;

    const router = core.http.createRouter();
    registerSearchRoute({ licenseState, router });
    registerExploreRoute({ licenseState, router });
  }

  public start() {}
  public stop() {
    if (this.licenseState) {
      this.licenseState.stop();
    }
  }
}
