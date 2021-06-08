/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'kibana/public';
import { CasesUiPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new CasesUiPlugin(initializerContext);
}

export { CasesUiPlugin };
export { CasesUiStart } from './types';
export { AllCasesProps } from './components/all_cases';
export { AllCasesSelectorModalProps } from './components/all_cases/selector_modal';
export { CaseViewProps } from './components/case_view';
export { ConfigureCasesProps } from './components/configure_cases';
export { CreateCaseProps } from './components/create';
export { RecentCasesProps } from './components/recent_cases';
