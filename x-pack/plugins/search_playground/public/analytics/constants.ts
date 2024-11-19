/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AnalyticsEvents {
  chatPageLoaded = 'chat_page_loaded',
  chatCleared = 'chat_cleared',
  chatQuestionSent = 'chat_question_sent',
  chatRequestStopped = 'chat_request_stopped',
  chatRegenerateMessages = 'chat_regenerate_messages',
  citationDetailsExpanded = 'citation_details_expanded',
  citationDetailsCollapsed = 'citation_details_collapsed',
  editContextFieldToggled = 'edit_context_field_toggled',
  editContextDocSizeChanged = 'edit_context_doc_size_changed',
  genAiConnectorAdded = 'gen_ai_connector_added',
  genAiConnectorCreated = 'gen_ai_connector_created',
  genAiConnectorExists = 'gen_ai_connector_exists',
  genAiConnectorSetup = 'gen_ai_connector_setup',
  includeCitations = 'include_citations',
  instructionsFieldChanged = 'instructions_field_changed',
  queryFieldsUpdated = 'view_query_fields_updated',
  queryBuilderFieldsUpdated = 'view_search_fields_updated',
  queryModeLoaded = 'query_mode_loaded',
  queryBuilderModeLoaded = 'search_builder_mode_loaded',
  modelSelected = 'model_selected',
  retrievalDocsFlyoutOpened = 'retrieval_docs_flyout_opened',
  sourceFieldsLoaded = 'source_fields_loaded',
  sourceIndexUpdated = 'source_index_updated',
  setupChatPageLoaded = 'start_new_chat_page_loaded',
  setupSearchPageLoaded = 'search_setup_page_loaded',
  viewCodeFlyoutOpened = 'view_code_flyout_opened',
  viewCodeLanguageChange = 'view_code_language_change',
}
