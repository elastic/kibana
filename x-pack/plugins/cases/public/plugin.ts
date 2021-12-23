/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import { CasesUiStart, SetupPlugins, StartPlugins } from './types';
import { KibanaServices } from './common/lib/kibana';
import { getCaseConnectorUi } from './components/connectors';
import {
  getCasesLazy,
  getRecentCasesLazy,
  getAllCasesSelectorModalLazy,
  getCreateCaseFlyoutLazy,
  canUseCases,
} from './methods';
import { CasesUiConfigType } from '../common/ui/types';
import { ENABLE_CASE_CONNECTOR } from '../common/constants';

/**
 * @public
 * A plugin for retrieving Cases UI components
 */
export class CasesUiPlugin implements Plugin<void, CasesUiStart, SetupPlugins, StartPlugins> {
  private kibanaVersion: string;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }
  public setup(core: CoreSetup, plugins: SetupPlugins) {
    if (ENABLE_CASE_CONNECTOR) {
      plugins.triggersActionsUi.actionTypeRegistry.register(getCaseConnectorUi());
    }
  }

  public start(core: CoreStart, plugins: StartPlugins): CasesUiStart {
    const config = this.initializerContext.config.get<CasesUiConfigType>();
    KibanaServices.init({ ...core, ...plugins, kibanaVersion: this.kibanaVersion, config });
    return {
      canUseCases: canUseCases(core.application.capabilities),
      getCases: getCasesLazy,
      getRecentCases: getRecentCasesLazy,
      getCreateCaseFlyout: getCreateCaseFlyoutLazy,
      getAllCasesSelectorModal: getAllCasesSelectorModalLazy,
    };
  }

  public stop() {}
}
