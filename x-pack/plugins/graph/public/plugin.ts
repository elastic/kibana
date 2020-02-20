/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart } from 'kibana/public';
import { Plugin } from 'src/core/public';
import { PluginInitializerContext } from 'kibana/public';
import { toggleNavLink } from './services/toggle_nav_link';
import { LicensingPluginSetup } from '../../licensing/public';
import { checkLicense } from '../common/check_license';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../src/plugins/home/public';
import { ConfigSchema } from '../config';

export interface GraphPluginSetupDependencies {
  licensing: LicensingPluginSetup;
  home?: HomePublicPluginSetup;
}

export class GraphPlugin implements Plugin<{ config: Readonly<ConfigSchema> }, void> {
  private licensing: LicensingPluginSetup | null = null;

  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {}

  setup(core: CoreSetup, { licensing, home }: GraphPluginSetupDependencies) {
    this.licensing = licensing;

    if (home) {
      home.featureCatalogue.register({
        id: 'graph',
        title: 'Graph',
        description: i18n.translate('xpack.graph.pluginDescription', {
          defaultMessage: 'Surface and analyze relevant relationships in your Elasticsearch data.',
        }),
        icon: 'graphApp',
        path: '/app/graph',
        showOnHomePage: true,
        category: FeatureCatalogueCategory.DATA,
      });
    }

    return {
      /**
       * The configuration is temporarily exposed to allow the legacy graph plugin to consume
       * the setting. Once the graph plugin is migrated completely, this will become an implementation
       * detail.
       * @deprecated
       */
      config: this.initializerContext.config.get(),
    };
  }

  start(core: CoreStart) {
    if (this.licensing === null) {
      throw new Error('Start called before setup');
    }
    this.licensing.license$.subscribe(license => {
      toggleNavLink(checkLicense(license), core.chrome.navLinks);
    });
  }

  stop() {}
}

export type GraphSetup = ReturnType<GraphPlugin['setup']>;
