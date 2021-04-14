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
  getAllCasesLazy,
  getCaseViewLazy,
  getConfigureCasesLazy,
  getCreateCaseLazy,
  getRecentCasesLazy,
  getAllCasesSelectorModalLazy,
} from './methods';
import { ENABLE_CASE_CONNECTOR } from '../common';

/**
 * @public
 * A plugin for retrieving Cases UI components
 */
export class CasesUiPlugin implements Plugin<void, CasesUiStart, SetupPlugins, StartPlugins> {
  private kibanaVersion: string;

  constructor(initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }
  public setup(core: CoreSetup, plugins: SetupPlugins) {
    if (ENABLE_CASE_CONNECTOR) {
      plugins.triggersActionsUi.actionTypeRegistry.register(getCaseConnectorUi());
    }
  }

  public start(core: CoreStart, plugins: StartPlugins): CasesUiStart {
    KibanaServices.init({ ...core, ...plugins, kibanaVersion: this.kibanaVersion });
    return {
      /**
       * Get the all cases table
       * @param props AllCasesProps
       * @return {ReactElement<AllCasesProps>}
       */
      getAllCases: (props) => {
        return getAllCasesLazy(props);
      },
      /**
       * Get the case view component
       * @param props CaseViewProps
       * @return {ReactElement<CaseViewProps>}
       */
      getCaseView: (props) => {
        return getCaseViewLazy(props);
      },
      /**
       * Get the configure case component
       * @param props ConfigureCasesProps
       * @return {ReactElement<ConfigureCasesProps>}
       */
      getConfigureCases: (props) => {
        return getConfigureCasesLazy(props);
      },
      /**
       * Get the create case form
       * @param props CreateCaseProps
       * @return {ReactElement<CreateCaseProps>}
       */
      getCreateCase: (props) => {
        return getCreateCaseLazy(props);
      },
      /**
       * Get the recent cases component
       * @param props RecentCasesProps
       * @return {ReactElement<RecentCasesProps>}
       */
      getRecentCases: (props) => {
        return getRecentCasesLazy(props);
      },
      /**
       * use Modal hook for all cases selector
       * @param props UseAllCasesSelectorModalProps
       * @return UseAllCasesSelectorModalReturnedValues
       */
      getAllCasesSelectorModal: (props) => {
        return getAllCasesSelectorModalLazy(props);
      },
    };
  }

  public stop() {}
}
