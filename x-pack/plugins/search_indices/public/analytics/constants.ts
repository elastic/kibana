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
  startCreateIndexPageModifyIndexName = 'start_modify_index_name',
  startCreateIndexClick = 'start_create_index',
  startCreateIndexLanguageSelect = 'start_code_lang_select',
  startCreateIndexCodeCopyInstall = 'start_code_copy_install',
  startCreateIndexCodeCopy = 'start_code_copy',
  startCreateIndexRunInConsole = 'start_cta_run_in_console',
  startCreateIndexCreatedRedirect = 'start_index_created_api',
  startFileUploadClick = 'start_file_upload',
  indexDetailsInstallCodeCopy = 'index_details_code_copy_install',
  indexDetailsAddMappingsCodeCopy = 'index_details_add_mappings_code_copy',
  indexDetailsIngestDocumentsCodeCopy = 'index_details_ingest_documents_code_copy',
  indexDetailsNavDataTab = 'index_details_nav_data_tab',
  indexDetailsNavSettingsTab = 'index_details_nav_settings_tab',
  indexDetailsNavMappingsTab = 'index_details_nav_mappings_tab',
}
