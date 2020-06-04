/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { nextTick, getRandomString, findTestSubject, TestBed } from '../../../../../test_utils';

export { setupEnvironment, WithAppDependencies, services } from './setup_environment';

export type TestSubjects =
  | 'aliasesTab'
  | 'appTitle'
  | 'cell'
  | 'closeDetailsButton'
  | 'createTemplateButton'
  | 'deleteSystemTemplateCallOut'
  | 'deleteTemplateButton'
  | 'deleteTemplatesConfirmation'
  | 'documentationLink'
  | 'emptyPrompt'
  | 'manageTemplateButton'
  | 'mappingsTab'
  | 'noAliasesCallout'
  | 'noMappingsCallout'
  | 'noSettingsCallout'
  | 'indicesList'
  | 'indicesTab'
  | 'indexTableIncludeHiddenIndicesToggle'
  | 'indexTableIndexNameLink'
  | 'reloadButton'
  | 'reloadIndicesButton'
  | 'row'
  | 'sectionError'
  | 'sectionLoading'
  | 'settingsTab'
  | 'summaryTab'
  | 'summaryTitle'
  | 'systemTemplatesSwitch'
  | 'templateDetails'
  | 'templateDetails.manageTemplateButton'
  | 'templateDetails.sectionLoading'
  | 'templateDetails.tab'
  | 'templateDetails.title'
  | 'templateList'
  | 'templateTable'
  | 'templatesTab';
