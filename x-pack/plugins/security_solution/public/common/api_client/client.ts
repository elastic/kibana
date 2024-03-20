/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptions } from '@kbn/core-http-browser';
import {} from '../../../common/api/detection_engine/model/rule_schema/specific_attributes/threshold_attributes.api_method.gen';
import type { SetAlertAssigneesRequestBody } from '../../../common/api/detection_engine/alert_assignees/set_alert_assignees_route.gen';
import { setAlertAssignees } from '../../../common/api/detection_engine/alert_assignees/set_alert_assignees_route.api_method.gen';
import type { SuggestUserProfilesRequestQuery } from '../../../common/api/detection_engine/users/suggest_user_profiles_route.gen';
import { suggestUserProfiles } from '../../../common/api/detection_engine/users/suggest_user_profiles_route.api_method.gen';
import type { GetSuggestionsRequestBody } from '../../../common/api/endpoint/suggestions/get_suggestions_route.gen';
import { getSuggestions } from '../../../common/api/endpoint/suggestions/get_suggestions_route.api_method.gen';
import { engineSettings } from '../../../common/api/entity_analytics/risk_engine/engine_settings_route.api_method.gen';
import { getPrebuiltRulesAndTimelinesStatus } from '../../../common/api/detection_engine/prebuilt_rules/get_prebuilt_rules_and_timelines_status/get_prebuilt_rules_and_timelines_status_route.api_method.gen';
import { installPrebuiltRulesAndTimelines } from '../../../common/api/detection_engine/prebuilt_rules/install_prebuilt_rules_and_timelines/install_prebuilt_rules_and_timelines_route.api_method.gen';
import type {
  PerformBulkActionsRequestBody,
  PerformBulkActionsRequestQuery,
} from '../../../common/api/detection_engine/rule_management/bulk_actions/perform_bulk_actions_route.gen';
import { performBulkActions } from '../../../common/api/detection_engine/rule_management/bulk_actions/perform_bulk_actions_route.api_method.gen';
import type {
  ExportRulesRequestBody,
  ExportRulesRequestQuery,
} from '../../../common/api/detection_engine/rule_management/export_rules/export_rules_route.gen';
import { exportRules } from '../../../common/api/detection_engine/rule_management/export_rules/export_rules_route.api_method.gen';
import type { ImportRulesRequestQuery } from '../../../common/api/detection_engine/rule_management/import_rules/import_rules_route.gen';
import { importRules } from '../../../common/api/detection_engine/rule_management/import_rules/import_rules_route.api_method.gen';
import type { FindRulesRequestQuery } from '../../../common/api/detection_engine/rule_management/find_rules/find_rules_route.gen';
import { findRules } from '../../../common/api/detection_engine/rule_management/find_rules/find_rules_route.api_method.gen';
import { readTags } from '../../../common/api/detection_engine/rule_management/read_tags/read_tags_route.api_method.gen';
import type { BulkCreateRulesRequestBody } from '../../../common/api/detection_engine/rule_management/bulk_crud/bulk_create_rules/bulk_create_rules_route.gen';
import { bulkCreateRules } from '../../../common/api/detection_engine/rule_management/bulk_crud/bulk_create_rules/bulk_create_rules_route.api_method.gen';
import type { BulkDeleteRulesRequestBody } from '../../../common/api/detection_engine/rule_management/bulk_crud/bulk_delete_rules/bulk_delete_rules_route.gen';
import { bulkDeleteRules } from '../../../common/api/detection_engine/rule_management/bulk_crud/bulk_delete_rules/bulk_delete_rules_route.api_method.gen';
import type { BulkPatchRulesRequestBody } from '../../../common/api/detection_engine/rule_management/bulk_crud/bulk_patch_rules/bulk_patch_rules_route.gen';
import { bulkPatchRules } from '../../../common/api/detection_engine/rule_management/bulk_crud/bulk_patch_rules/bulk_patch_rules_route.api_method.gen';
import type { BulkUpdateRulesRequestBody } from '../../../common/api/detection_engine/rule_management/bulk_crud/bulk_update_rules/bulk_update_rules_route.gen';
import { bulkUpdateRules } from '../../../common/api/detection_engine/rule_management/bulk_crud/bulk_update_rules/bulk_update_rules_route.api_method.gen';
import type { DeleteRuleRequestQuery } from '../../../common/api/detection_engine/rule_management/crud/delete_rule/delete_rule_route.gen';
import { deleteRule } from '../../../common/api/detection_engine/rule_management/crud/delete_rule/delete_rule_route.api_method.gen';
import type { CreateRuleRequestBody } from '../../../common/api/detection_engine/rule_management/crud/create_rule/create_rule_route.gen';
import { createRule } from '../../../common/api/detection_engine/rule_management/crud/create_rule/create_rule_route.api_method.gen';
import type { PatchRuleRequestBody } from '../../../common/api/detection_engine/rule_management/crud/patch_rule/patch_rule_route.gen';
import { patchRule } from '../../../common/api/detection_engine/rule_management/crud/patch_rule/patch_rule_route.api_method.gen';
import type { ReadRuleRequestQuery } from '../../../common/api/detection_engine/rule_management/crud/read_rule/read_rule_route.gen';
import { readRule } from '../../../common/api/detection_engine/rule_management/crud/read_rule/read_rule_route.api_method.gen';
import type { UpdateRuleRequestBody } from '../../../common/api/detection_engine/rule_management/crud/update_rule/update_rule_route.gen';
import { updateRule } from '../../../common/api/detection_engine/rule_management/crud/update_rule/update_rule_route.api_method.gen';
import type { GetRuleExecutionEventsRequestQuery } from '../../../common/api/detection_engine/rule_monitoring/rule_execution_logs/get_rule_execution_events/get_rule_execution_events_route.gen';
import { getRuleExecutionEvents } from '../../../common/api/detection_engine/rule_monitoring/rule_execution_logs/get_rule_execution_events/get_rule_execution_events_route.api_method.gen';
import type { GetRuleExecutionResultsRequestQuery } from '../../../common/api/detection_engine/rule_monitoring/rule_execution_logs/get_rule_execution_results/get_rule_execution_results_route.gen';
import { getRuleExecutionResults } from '../../../common/api/detection_engine/rule_monitoring/rule_execution_logs/get_rule_execution_results/get_rule_execution_results_route.api_method.gen';

interface HttpClient {
  fetch<T>(url: string, options: HttpFetchOptions): Promise<T>;
}

export class ApiClient<TClient extends HttpClient> {
  private client: TClient;

  constructor(client: TClient) {
    this.client = client;
  }

  public async(signal?: AbortSignal) {
    return this.client, signal;
  }

  /*
   * Assigns users to alerts.
   */
  public async setAlertAssignees(params: SetAlertAssigneesRequestBody, signal?: AbortSignal) {
    return setAlertAssignees(this.client, params, signal);
  }

  /*
   * Suggests user profiles.
   */
  public async suggestUserProfiles(query: SuggestUserProfilesRequestQuery, signal?: AbortSignal) {
    return suggestUserProfiles(this.client, query, signal);
  }

  public async getSuggestions(params: GetSuggestionsRequestBody, signal?: AbortSignal) {
    return getSuggestions(this.client, params, signal);
  }

  public async engineSettings(signal?: AbortSignal) {
    return engineSettings(this.client, signal);
  }

  public async getPrebuiltRulesAndTimelinesStatus(signal?: AbortSignal) {
    return getPrebuiltRulesAndTimelinesStatus(this.client, signal);
  }

  public async installPrebuiltRulesAndTimelines(signal?: AbortSignal) {
    return installPrebuiltRulesAndTimelines(this.client, signal);
  }

  /*
   * The bulk action is applied to all rules that match the filter or to the list of rules by their IDs.
   */
  public async performBulkActions(
    params: PerformBulkActionsRequestBody,
    query: PerformBulkActionsRequestQuery,
    signal?: AbortSignal
  ) {
    return performBulkActions(this.client, params, query, signal);
  }

  /*
   * Exports rules to an &#x60;.ndjson&#x60; file. The following configuration items are also included in the &#x60;.ndjson&#x60; file - Actions, Exception lists. Prebuilt rules cannot be exported.
   */
  public async exportRules(
    params: ExportRulesRequestBody,
    query: ExportRulesRequestQuery,
    signal?: AbortSignal
  ) {
    return exportRules(this.client, params, query, signal);
  }

  /*
   * Imports rules from an &#x60;.ndjson&#x60; file, including actions and exception lists.
   */
  public async importRules(query: ImportRulesRequestQuery, signal?: AbortSignal) {
    return importRules(this.client, query, signal);
  }

  /*
   * Finds rules that match the given query.
   */
  public async findRules(query: FindRulesRequestQuery, signal?: AbortSignal) {
    return findRules(this.client, query, signal);
  }

  public async readTags(signal?: AbortSignal) {
    return readTags(this.client, signal);
  }

  /*
   * Creates new detection rules in bulk.
   */
  public async bulkCreateRules(params: BulkCreateRulesRequestBody, signal?: AbortSignal) {
    return bulkCreateRules(this.client, params, signal);
  }

  /*
   * Deletes multiple rules.
   */
  public async bulkDeleteRules(params: BulkDeleteRulesRequestBody, signal?: AbortSignal) {
    return bulkDeleteRules(this.client, params, signal);
  }

  /*
   * Updates multiple rules using the &#x60;PATCH&#x60; method.
   */
  public async bulkPatchRules(params: BulkPatchRulesRequestBody, signal?: AbortSignal) {
    return bulkPatchRules(this.client, params, signal);
  }

  /*
   * Updates multiple rules using the &#x60;PUT&#x60; method.
   */
  public async bulkUpdateRules(params: BulkUpdateRulesRequestBody, signal?: AbortSignal) {
    return bulkUpdateRules(this.client, params, signal);
  }

  /*
   * Deletes a single rule using the &#x60;rule_id&#x60; or &#x60;id&#x60; field.
   */
  public async deleteRule(query: DeleteRuleRequestQuery, signal?: AbortSignal) {
    return deleteRule(this.client, query, signal);
  }

  /*
   * Create a single detection rule
   */
  public async createRule(params: CreateRuleRequestBody, signal?: AbortSignal) {
    return createRule(this.client, params, signal);
  }

  /*
   * Patch a single rule
   */
  public async patchRule(params: PatchRuleRequestBody, signal?: AbortSignal) {
    return patchRule(this.client, params, signal);
  }

  /*
   * Read a single rule
   */
  public async readRule(query: ReadRuleRequestQuery, signal?: AbortSignal) {
    return readRule(this.client, query, signal);
  }

  /*
   * Update a single rule
   */
  public async updateRule(params: UpdateRuleRequestBody, signal?: AbortSignal) {
    return updateRule(this.client, params, signal);
  }

  public async getRuleExecutionEvents(
    query: GetRuleExecutionEventsRequestQuery,
    signal?: AbortSignal
  ) {
    return getRuleExecutionEvents(this.client, query, signal);
  }

  public async getRuleExecutionResults(
    query: GetRuleExecutionResultsRequestQuery,
    signal?: AbortSignal
  ) {
    return getRuleExecutionResults(this.client, query, signal);
  }
}
