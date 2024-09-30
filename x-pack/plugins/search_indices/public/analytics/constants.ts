/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AnalyticsEvents {
  startPageOpened = 'start_page_opened',
  startPageShowCodeClick = 'start_page_show_code',
  startPageShowCreateIndexUIClick = 'start_page_show_create_index_ui',
  startCreateIndexClick = 'start_create_index',
  startCreateIndexLanguageSelect = 'start_code_lang_select',
  startCreateIndexCodeCopyInstall = 'start_code_copy_install',
  startCreateIndexCodeCopy = 'start_code_copy',
}
