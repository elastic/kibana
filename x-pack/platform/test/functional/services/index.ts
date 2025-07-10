/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as kibanaFunctionalServices } from '@kbn/test-suites-src/functional/services';
import { services as kibanaApiIntegrationServices } from '@kbn/test-suites-src/api_integration/services';
import { services as kibanaXPackApiIntegrationServices } from '../../api_integration/services';
import { UserMenuProvider } from './user_menu';
import { AceEditorProvider } from './ace_editor';
import { SampleDataServiceProvider } from './sample_data';
import { GrokDebuggerProvider } from './grok_debugger';
import { SearchSessionsService } from './search_sessions';
import { CasesServiceProvider } from './cases';
import { ActionsServiceProvider } from './actions';
import { AiopsProvider } from './aiops';
import { RulesServiceProvider } from './rules';
import { CanvasElementProvider } from './canvas_element';
import { MachineLearningProvider } from './ml';
import { TransformProvider } from './transform';

// define the name and providers for services that should be
// available to your tests. If you don't specify anything here
// only the built-in services will be available
export const services = {
  ...kibanaFunctionalServices,
  actions: ActionsServiceProvider,
  aiops: AiopsProvider,
  canvasElement: CanvasElementProvider,
  cases: CasesServiceProvider,
  supertest: kibanaApiIntegrationServices.supertest,
  supertestWithoutAuth: kibanaXPackApiIntegrationServices.supertestWithoutAuth,
  esSupertest: kibanaApiIntegrationServices.esSupertest,
  dataViewApi: kibanaXPackApiIntegrationServices.dataViewApi,
  spaces: kibanaXPackApiIntegrationServices.spaces,
  apmSynthtraceKibanaClient: kibanaXPackApiIntegrationServices.apmSynthtraceKibanaClient,
  userMenu: UserMenuProvider,
  aceEditor: AceEditorProvider,
  rules: RulesServiceProvider,
  sampleData: SampleDataServiceProvider,
  grokDebugger: GrokDebuggerProvider,
  searchSessions: SearchSessionsService,
  ml: MachineLearningProvider,
  transform: TransformProvider,
};
