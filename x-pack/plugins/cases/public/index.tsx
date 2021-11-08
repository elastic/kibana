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

export type { CasesUiPlugin };
export type { CasesUiStart } from './types';
export type { AllCasesProps } from './components/all_cases';
export type { AllCasesSelectorModalProps } from './components/all_cases/selector_modal';
export type { CaseViewProps } from './components/case_view';
export type { CreateCaseProps } from './components/create';
export type { RecentCasesProps } from './components/recent_cases';

export type { CasesDeepLinkId } from './common/navigation';
export { getCasesDeepLinks, casesDeepLinkIds, generateCaseViewPath } from './common/navigation';
