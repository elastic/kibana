/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { camelCase } from 'lodash';
import { FullResponseSchema } from '../../../../../common/detection_engine/schemas/request';
import { HttpStart } from '../../../../../../../../src/core/public';
import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_PREPACKAGED_URL,
  DETECTION_ENGINE_RULES_STATUS_URL,
  DETECTION_ENGINE_PREPACKAGED_RULES_STATUS_URL,
  DETECTION_ENGINE_TAGS_URL,
  DETECTION_ENGINE_RULES_BULK_ACTION,
} from '../../../../../common/constants';
import {
  UpdateRulesProps,
  CreateRulesProps,
  DeleteRulesProps,
  DuplicateRulesProps,
  EnableRulesProps,
  FetchRulesProps,
  FetchRulesResponse,
  Rule,
  FetchRuleProps,
  BasicFetchProps,
  ImportDataProps,
  ExportDocumentsProps,
  RuleStatusResponse,
  ImportDataResponse,
  PrePackagedRulesStatusResponse,
  BulkRuleResponse,
  PatchRuleProps,
  BulkActionProps,
  BulkActionResponse,
} from './types';
import { KibanaServices } from '../../../../common/lib/kibana';
import * as i18n from '../../../pages/detection_engine/rules/translations';
import { RulesSchema } from '../../../../../common/detection_engine/schemas/response';
import { convertRulesFilterToKQL } from './utils';
import { BulkAction } from '../../../../../common/detection_engine/schemas/common/schemas';

/**
 * Create provided Rule
 *
 * @param rule CreateRulesSchema to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const createRule = async ({ rule, signal }: CreateRulesProps): Promise<FullResponseSchema> =>
  KibanaServices.get().http.fetch<FullResponseSchema>(DETECTION_ENGINE_RULES_URL, {
    method: 'POST',
    body: JSON.stringify(rule),
    signal,
  });

/**
 * Update provided Rule using PUT
 *
 * @param rule UpdateRulesSchema to be updated
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const updateRule = async ({ rule, signal }: UpdateRulesProps): Promise<RulesSchema> =>
  KibanaServices.get().http.fetch<RulesSchema>(DETECTION_ENGINE_RULES_URL, {
    method: 'PUT',
    body: JSON.stringify(rule),
    signal,
  });

/**
 * Patch provided rule
 * NOTE: The rule edit flow does NOT use patch as it relies on the
 * functionality of PUT to delete field values when not provided, if
 * just expecting changes, use this `patchRule`
 *
 * @param ruleProperties to patch
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const patchRule = async ({ ruleProperties, signal }: PatchRuleProps): Promise<RulesSchema> =>
  KibanaServices.get().http.fetch<RulesSchema>(DETECTION_ENGINE_RULES_URL, {
    method: 'PATCH',
    body: JSON.stringify(ruleProperties),
    signal,
  });

/**
 * Fetches all rules from the Detection Engine API
 *
 * @param filterOptions desired filters (e.g. filter/sortField/sortOrder)
 * @param pagination desired pagination options (e.g. page/perPage)
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchRules = async ({
  filterOptions = {
    filter: '',
    sortField: 'enabled',
    sortOrder: 'desc',
    showCustomRules: false,
    showElasticRules: false,
    tags: [],
  },
  pagination = {
    page: 1,
    perPage: 20,
    total: 0,
  },
  signal,
}: FetchRulesProps): Promise<FetchRulesResponse> => {
  const filterString = convertRulesFilterToKQL(filterOptions);

  // Sort field is camel cased because we use that in our mapping, but display snake case on the front end
  const getFieldNameForSortField = (field: string) => {
    return field === 'name' ? `${field}.keyword` : camelCase(field);
  };

  const query = {
    page: pagination.page,
    per_page: pagination.perPage,
    sort_field: getFieldNameForSortField(filterOptions.sortField),
    sort_order: filterOptions.sortOrder,
    ...(filterString !== '' ? { filter: filterString } : {}),
  };

  return KibanaServices.get().http.fetch<FetchRulesResponse>(
    `${DETECTION_ENGINE_RULES_URL}/_find`,
    {
      method: 'GET',
      query,
      signal,
    }
  );
};

/**
 * Fetch a Rule by providing a Rule ID
 *
 * @param id Rule ID's (not rule_id)
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchRuleById = async ({ id, signal }: FetchRuleProps): Promise<Rule> =>
  pureFetchRuleById({ id, http: KibanaServices.get().http, signal });

/**
 * Fetch a Rule by providing a Rule ID
 *
 * @param id Rule ID's (not rule_id)
 * @param http Kibana http service
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const pureFetchRuleById = async ({
  id,
  http,
  signal,
}: FetchRuleProps & { http: HttpStart }): Promise<Rule> =>
  http.fetch<Rule>(DETECTION_ENGINE_RULES_URL, {
    method: 'GET',
    query: { id },
    signal,
  });

/**
 * Enables/Disables provided Rule ID's
 *
 * @param ids array of Rule ID's (not rule_id) to enable/disable
 * @param enabled to enable or disable
 *
 * @throws An error if response is not OK
 */
export const enableRules = async ({ ids, enabled }: EnableRulesProps): Promise<BulkRuleResponse> =>
  KibanaServices.get().http.fetch<BulkRuleResponse>(`${DETECTION_ENGINE_RULES_URL}/_bulk_update`, {
    method: 'PATCH',
    body: JSON.stringify(ids.map((id) => ({ id, enabled }))),
  });

/**
 * Deletes provided Rule ID's
 *
 * @param ids array of Rule ID's (not rule_id) to delete
 *
 * @throws An error if response is not OK
 */
export const deleteRules = async ({ ids }: DeleteRulesProps): Promise<BulkRuleResponse> =>
  KibanaServices.get().http.fetch<Rule[]>(`${DETECTION_ENGINE_RULES_URL}/_bulk_delete`, {
    method: 'POST',
    body: JSON.stringify(ids.map((id) => ({ id }))),
  });

/**
 * Duplicates provided Rules
 *
 * @param rules to duplicate
 *
 * @throws An error if response is not OK
 */
export const duplicateRules = async ({ rules }: DuplicateRulesProps): Promise<BulkRuleResponse> =>
  KibanaServices.get().http.fetch<Rule[]>(`${DETECTION_ENGINE_RULES_URL}/_bulk_create`, {
    method: 'POST',
    body: JSON.stringify(
      rules.map((rule) => ({
        ...rule,
        name: `${rule.name} [${i18n.DUPLICATE}]`,
        created_at: undefined,
        created_by: undefined,
        id: undefined,
        rule_id: undefined,
        updated_at: undefined,
        updated_by: undefined,
        enabled: false,
        immutable: undefined,
        last_success_at: undefined,
        last_success_message: undefined,
        last_failure_at: undefined,
        last_failure_message: undefined,
        status: undefined,
        status_date: undefined,
      }))
    ),
  });

/**
 * Perform bulk action with rules selected by a filter query
 *
 * @param query filter query to select rules to perform bulk action with
 * @param action bulk action to perform
 *
 * @throws An error if response is not OK
 */
export const performBulkAction = async <Action extends BulkAction>({
  action,
  query,
}: BulkActionProps<Action>): Promise<BulkActionResponse<Action>> =>
  KibanaServices.get().http.fetch<BulkActionResponse<Action>>(DETECTION_ENGINE_RULES_BULK_ACTION, {
    method: 'POST',
    body: JSON.stringify({ action, query }),
  });

/**
 * Create Prepackaged Rules
 *
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const createPrepackagedRules = async ({
  signal,
}: BasicFetchProps): Promise<{
  rules_installed: number;
  rules_updated: number;
  timelines_installed: number;
  timelines_updated: number;
}> => {
  const result = await KibanaServices.get().http.fetch<{
    rules_installed: number;
    rules_updated: number;
    timelines_installed: number;
    timelines_updated: number;
  }>(DETECTION_ENGINE_PREPACKAGED_URL, {
    method: 'PUT',
    signal,
  });

  return result;
};

/**
 * Imports rules in the same format as exported via the _export API
 *
 * @param fileToImport File to upload containing rules to import
 * @param overwrite whether or not to overwrite rules with the same ruleId
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const importRules = async ({
  fileToImport,
  overwrite = false,
  signal,
}: ImportDataProps): Promise<ImportDataResponse> => {
  const formData = new FormData();
  formData.append('file', fileToImport);

  return KibanaServices.get().http.fetch<ImportDataResponse>(
    `${DETECTION_ENGINE_RULES_URL}/_import`,
    {
      method: 'POST',
      headers: { 'Content-Type': undefined },
      query: { overwrite },
      body: formData,
      signal,
    }
  );
};

/**
 * Export rules from the server as a file download
 *
 * @param excludeExportDetails whether or not to exclude additional details at bottom of exported file (defaults to false)
 * @param filename of exported rules. Be sure to include `.ndjson` extension! (defaults to localized `rules_export.ndjson`)
 * @param ruleIds array of rule_id's (not id!) to export (empty array exports _all_ rules)
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const exportRules = async ({
  excludeExportDetails = false,
  filename = `${i18n.EXPORT_FILENAME}.ndjson`,
  ids = [],
  signal,
}: ExportDocumentsProps): Promise<Blob> => {
  const body =
    ids.length > 0
      ? JSON.stringify({ objects: ids.map((rule) => ({ rule_id: rule })) })
      : undefined;

  return KibanaServices.get().http.fetch<Blob>(`${DETECTION_ENGINE_RULES_URL}/_export`, {
    method: 'POST',
    body,
    query: {
      exclude_export_details: excludeExportDetails,
      file_name: filename,
    },
    signal,
  });
};

/**
 * Get Rule Status provided Rule ID
 *
 * @param id string of Rule ID's (not rule_id)
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const getRuleStatusById = async ({
  id,
  signal,
}: {
  id: string;
  signal: AbortSignal;
}): Promise<RuleStatusResponse> =>
  KibanaServices.get().http.fetch<RuleStatusResponse>(DETECTION_ENGINE_RULES_STATUS_URL, {
    method: 'POST',
    body: JSON.stringify({ ids: [id] }),
    signal,
  });

/**
 * Return rule statuses given list of alert ids
 *
 * @param ids array of string of Rule ID's (not rule_id)
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const getRulesStatusByIds = async ({
  ids,
  signal,
}: {
  ids: string[];
  signal: AbortSignal;
}): Promise<RuleStatusResponse> => {
  const res = await KibanaServices.get().http.fetch<RuleStatusResponse>(
    DETECTION_ENGINE_RULES_STATUS_URL,
    {
      method: 'POST',
      body: JSON.stringify({ ids }),
      signal,
    }
  );
  return res;
};

/**
 * Fetch all unique Tags used by Rules
 *
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchTags = async ({ signal }: { signal: AbortSignal }): Promise<string[]> =>
  KibanaServices.get().http.fetch<string[]>(DETECTION_ENGINE_TAGS_URL, {
    method: 'GET',
    signal,
  });

/**
 * Get pre packaged rules Status
 *
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const getPrePackagedRulesStatus = async ({
  signal,
}: {
  signal: AbortSignal;
}): Promise<PrePackagedRulesStatusResponse> =>
  KibanaServices.get().http.fetch<PrePackagedRulesStatusResponse>(
    DETECTION_ENGINE_PREPACKAGED_RULES_STATUS_URL,
    {
      method: 'GET',
      signal,
    }
  );
