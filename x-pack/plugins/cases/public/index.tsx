/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializerContext } from '../../../../src/core/public/plugins/plugin_context';
import { CasesUiPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new CasesUiPlugin(initializerContext);
}

export type { AllCasesProps } from './components/all_cases';
export type { AllCasesSelectorModalProps } from './components/all_cases/selector_modal';
export type { CaseViewProps } from './components/case_view';
export type { ConfigureCasesProps } from './components/configure_cases';
export type { CreateCaseProps } from './components/create';
export type { RecentCasesProps } from './components/recent_cases';
export type { CasesUiStart } from './types';
export type { CasesUiPlugin };
