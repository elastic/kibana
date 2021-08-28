/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, CoreStart } from '../../../../src/core/public/types';
import type { Plugin } from '../../../../src/core/public/plugins/plugin';
import type { PluginInitializerContext } from '../../../../src/core/public/plugins/plugin_context';
import { ENABLE_CASE_CONNECTOR } from '../common/constants';
import type { CasesUiConfigType } from '../common/ui/types';
import { KibanaServices } from './common/lib/kibana/services';
import { getCaseConnectorUi } from './components/connectors/case';
import { getAllCasesLazy } from './methods/get_all_cases';
import { getAllCasesSelectorModalLazy } from './methods/get_all_cases_selector_modal';
import { getCaseViewLazy } from './methods/get_case_view';
import { getConfigureCasesLazy } from './methods/get_configure_cases';
import { getCreateCaseLazy } from './methods/get_create_case';
import { getRecentCasesLazy } from './methods/get_recent_cases';
import type { CasesUiStart, SetupPlugins, StartPlugins } from './types';

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
      /**
       * Get the all cases table
       * @param props AllCasesProps
       * @return {ReactElement<AllCasesProps>}
       */
      getAllCases: getAllCasesLazy,
      /**
       * Get the case view component
       * @param props CaseViewProps
       * @return {ReactElement<CaseViewProps>}
       */
      getCaseView: getCaseViewLazy,
      /**
       * Get the configure case component
       * @param props ConfigureCasesProps
       * @return {ReactElement<ConfigureCasesProps>}
       */
      getConfigureCases: getConfigureCasesLazy,
      /**
       * Get the create case form
       * @param props CreateCaseProps
       * @return {ReactElement<CreateCaseProps>}
       */
      getCreateCase: getCreateCaseLazy,
      /**
       * Get the recent cases component
       * @param props RecentCasesProps
       * @return {ReactElement<RecentCasesProps>}
       */
      getRecentCases: getRecentCasesLazy,
      /**
       * use Modal hook for all cases selector
       * @param props UseAllCasesSelectorModalProps
       * @return UseAllCasesSelectorModalReturnedValues
       */
      getAllCasesSelectorModal: getAllCasesSelectorModalLazy,
    };
  }

  public stop() {}
}
