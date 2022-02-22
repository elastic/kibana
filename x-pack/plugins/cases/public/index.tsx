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
export type { GetCasesProps } from './methods/get_cases';
export type { GetCreateCaseFlyoutProps } from './methods/get_create_case_flyout';
export type { GetAllCasesSelectorModalProps } from './methods/get_all_cases_selector_modal';
export type { GetRecentCasesProps } from './methods/get_recent_cases';

export type { CaseAttachments } from './components/create/form';

export type { ICasesDeepLinkId } from './common/navigation';
export {
  getCasesDeepLinks,
  CasesDeepLinkId,
  generateCaseViewPath,
  getCreateCasePath,
  getCaseViewPath,
  getCasesConfigurePath,
} from './common/navigation';
