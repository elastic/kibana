/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Plugin, CoreSetup } from 'src/core/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { LicenseState } from './lib/license_state';
import { registerSearchRoute } from './routes/search';
import { registerExploreRoute } from './routes/explore';
import { HomeServerPluginSetup } from '../../../../src/plugins/home/server';
import { registerSampleData } from './sample_data';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { graphWorkspace } from './saved_objects';

export class GraphPlugin implements Plugin {
  private licenseState: LicenseState | null = null;

  public async setup(
    core: CoreSetup,
    {
      licensing,
      home,
      features,
    }: {
      licensing: LicensingPluginSetup;
      home?: HomeServerPluginSetup;
      features?: FeaturesPluginSetup;
    }
  ) {
    const licenseState = new LicenseState();
    licenseState.start(licensing.license$);
    this.licenseState = licenseState;
    core.savedObjects.registerType(graphWorkspace);

    if (home) {
      registerSampleData(home.sampleData, licenseState);
    }

    if (features) {
      features.registerFeature({
        id: 'graph',
        name: i18n.translate('xpack.graph.featureRegistry.graphFeatureName', {
          defaultMessage: 'Graph',
        }),
        order: 1200,
        icon: 'graphApp',
        navLinkId: 'graph',
        app: ['graph', 'kibana'],
        catalogue: ['graph'],
        validLicenses: ['platinum', 'enterprise', 'trial'],
        privileges: {
          all: {
            app: ['graph', 'kibana'],
            catalogue: ['graph'],
            savedObject: {
              all: ['graph-workspace'],
              read: ['index-pattern'],
            },
            ui: ['save', 'delete'],
          },
          read: {
            app: ['graph', 'kibana'],
            catalogue: ['graph'],
            savedObject: {
              all: [],
              read: ['index-pattern', 'graph-workspace'],
            },
            ui: [],
          },
        },
      });
    }

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
