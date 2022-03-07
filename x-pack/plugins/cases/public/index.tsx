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

export { DRAFT_COMMENT_STORAGE_ID } from './components/markdown_editor/plugins/lens/constants';

export type { CasesUiPlugin };
export type { CasesUiStart } from './types';
export type {
  GetCasesProps,
  GetCreateCaseFlyoutProps,
  GetAllCasesSelectorModalProps,
  GetRecentCasesProps,
} from './client';

export type { CaseAttachments, SupportedCaseAttachment } from './types';

export type { ICasesDeepLinkId } from './common/navigation';
export {
  getCasesDeepLinks,
  CasesDeepLinkId,
  generateCaseViewPath,
  getCreateCasePath,
  getCaseViewPath,
  getCasesConfigurePath,
} from './common/navigation';
