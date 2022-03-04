/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import { CasesUiStart, CasesPluginSetup, CasesPluginStart } from './types';
import { KibanaServices } from './common/lib/kibana';
import {
  getCasesLazy,
  getRecentCasesLazy,
  getAllCasesSelectorModalLazy,
  getCreateCaseFlyoutLazy,
  canUseCases,
  getCreateCaseFlyoutLazyNoProvider,
  getAllCasesSelectorModalNoProviderLazy,
} from './methods';
import { CasesUiConfigType } from '../common/ui/types';
import { APP_ID, APP_PATH } from '../common/constants';
import { APP_TITLE, APP_DESC } from './common/translations';
import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public';
import { ManagementAppMountParams } from '../../../../src/plugins/management/public';
import { Storage } from '../../../../src/plugins/kibana_utils/public';
import { getCasesContextLazy } from './methods/get_cases_context';
import { useCasesAddToExistingCaseModal } from './components/all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import { useCasesAddToNewCaseFlyout } from './components/create/flyout/use_cases_add_to_new_case_flyout';
import { getRuleIdFromEvent } from './methods/get_rule_id_from_event';

/**
 * @public
 * A plugin for retrieving Cases UI components
 */
export class CasesUiPlugin
  implements Plugin<void, CasesUiStart, CasesPluginSetup, CasesPluginStart>
{
  private readonly kibanaVersion: string;
  private readonly storage = new Storage(localStorage);

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup, plugins: CasesPluginSetup) {
    const kibanaVersion = this.kibanaVersion;
    const storage = this.storage;

    if (plugins.home) {
      plugins.home.featureCatalogue.register({
        id: APP_ID,
        title: APP_TITLE,
        description: APP_DESC,
        icon: 'watchesApp',
        path: APP_PATH,
        showOnHomePage: false,
        category: FeatureCatalogueCategory.ADMIN,
      });
    }

    plugins.management.sections.section.insightsAndAlerting.registerApp({
      id: APP_ID,
      title: APP_TITLE,
      order: 0,
      async mount(params: ManagementAppMountParams) {
        const [coreStart, pluginsStart] = (await core.getStartServices()) as [
          CoreStart,
          CasesPluginStart,
          unknown
        ];

        const { renderApp } = await import('./application');

        return renderApp({
          mountParams: params,
          coreStart,
          pluginsStart,
          storage,
          kibanaVersion,
        });
      },
    });

    // Return methods that should be available to other plugins
    return {};
  }

  public start(core: CoreStart, plugins: CasesPluginStart): CasesUiStart {
    const config = this.initializerContext.config.get<CasesUiConfigType>();
    KibanaServices.init({ ...core, ...plugins, kibanaVersion: this.kibanaVersion, config });
    return {
      canUseCases: canUseCases(core.application.capabilities),
      getCases: getCasesLazy,
      getCasesContext: getCasesContextLazy,
      getRecentCases: getRecentCasesLazy,
      getCreateCaseFlyout: getCreateCaseFlyoutLazy,
      getAllCasesSelectorModal: getAllCasesSelectorModalLazy,
      // Temporal methods to remove timelines and cases deep integration
      // https://github.com/elastic/kibana/issues/123183
      getCreateCaseFlyoutNoProvider: getCreateCaseFlyoutLazyNoProvider,
      getAllCasesSelectorModalNoProvider: getAllCasesSelectorModalNoProviderLazy,
      hooks: {
        getUseCasesAddToNewCaseFlyout: useCasesAddToNewCaseFlyout,
        getUseCasesAddToExistingCaseModal: useCasesAddToExistingCaseModal,
      },
      helpers: {
        getRuleIdFromEvent,
      },
    };
  }

  public stop() {}
}
