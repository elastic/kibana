/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { camelCase } from 'lodash';
import dateMath from '@kbn/datemath';
import { HttpStart } from '@kbn/core/public';

import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_PREPACKAGED_URL,
  DETECTION_ENGINE_PREPACKAGED_RULES_STATUS_URL,
  DETECTION_ENGINE_TAGS_URL,
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_PREVIEW,
  detectionEngineRuleExecutionEventsUrl,
} from '../../../../../common/constants';
import {
  AggregateRuleExecutionEvent,
  BulkAction,
  RuleExecutionStatus,
} from '../../../../../common/detection_engine/schemas/common';
import {
  FullResponseSchema,
  PreviewResponse,
} from '../../../../../common/detection_engine/schemas/request';
import {
  RulesSchema,
  GetAggregateRuleExecutionEventsResponse,
} from '../../../../../common/detection_engine/schemas/response';

import {
  UpdateRulesProps,
  CreateRulesProps,
  FetchRulesProps,
  FetchRulesResponse,
  Rule,
  FetchRuleProps,
  BasicFetchProps,
  ImportDataProps,
  ExportDocumentsProps,
  ImportDataResponse,
  PrePackagedRulesStatusResponse,
  PatchRuleProps,
  BulkActionProps,
  BulkActionResponseMap,
  PreviewRulesProps,
} from './types';
import { KibanaServices } from '../../../../common/lib/kibana';
import * as i18n from '../../../pages/detection_engine/rules/translations';
import { convertRulesFilterToKQL } from './utils';

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
 * Preview provided Rule
 *
 * @param rule CreateRulesSchema to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const previewRule = async ({ rule, signal }: PreviewRulesProps): Promise<PreviewResponse> =>
  KibanaServices.get().http.fetch<PreviewResponse>(DETECTION_ENGINE_RULES_PREVIEW, {
    method: 'POST',
    body: JSON.stringify(rule),
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
    showCustomRules: false,
    showElasticRules: false,
    tags: [],
  },
  sortingOptions = {
    field: 'enabled',
    order: 'desc',
  },
  pagination = {
    page: 1,
    perPage: 20,
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
    sort_field: getFieldNameForSortField(sortingOptions.field),
    sort_order: sortingOptions.order,
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
 * Perform bulk action with rules selected by a filter query
 *
 * @param query filter query to select rules to perform bulk action with
 * @param ids string[] rule ids to select rules to perform bulk action with
 * @param edit BulkEditActionPayload edit action payload
 * @param action bulk action to perform
 *
 * @throws An error if response is not OK
 */
export const performBulkAction = async <Action extends BulkAction>({
  action,
  query,
  edit,
  ids,
}: BulkActionProps<Action>): Promise<BulkActionResponseMap<Action>> =>
  KibanaServices.get().http.fetch<BulkActionResponseMap<Action>>(
    DETECTION_ENGINE_RULES_BULK_ACTION,
    {
      method: 'POST',
      body: JSON.stringify({
        action,
        ...(edit ? { edit } : {}),
        ...(ids ? { ids } : {}),
        ...(query !== undefined ? { query } : {}),
      }),
    }
  );

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
  overwriteExceptions = false,
  signal,
}: ImportDataProps): Promise<ImportDataResponse> => {
  const formData = new FormData();
  formData.append('file', fileToImport);

  return KibanaServices.get().http.fetch<ImportDataResponse>(
    `${DETECTION_ENGINE_RULES_URL}/_import`,
    {
      method: 'POST',
      headers: { 'Content-Type': undefined },
      query: { overwrite, overwrite_exceptions: overwriteExceptions },
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
 * Fetch rule execution events (e.g. status changes) from Event Log.
 *
 * @param ruleId Saved Object ID of the rule (`rule.id`, not static `rule.rule_id`)
 * @param start Start daterange either in UTC ISO8601 or as datemath string (e.g. `2021-12-29T02:44:41.653Z` or `now-30`)
 * @param end End daterange either in UTC ISO8601 or as datemath string (e.g. `2021-12-29T02:44:41.653Z` or `now/w`)
 * @param queryText search string in querystring format (e.g. `event.duration > 1000 OR kibana.alert.rule.execution.metrics.execution_gap_duration_s > 100`)
 * @param statusFilters RuleExecutionStatus[] array of `statusFilters` (e.g. `succeeded,failed,partial failure`)
 * @param page current page to fetch
 * @param perPage number of results to fetch per page
 * @param sortField keyof AggregateRuleExecutionEvent field to sort by
 * @param sortOrder SortOrder what order to sort by (e.g. `asc` or `desc`)
 * @param signal AbortSignal Optional signal for cancelling the request
 *
 * @throws An error if response is not OK
 */
export const fetchRuleExecutionEvents = async ({
  ruleId,
  start,
  end,
  queryText,
  statusFilters,
  page,
  perPage,
  sortField,
  sortOrder,
  signal,
}: {
  ruleId: string;
  start: string;
  end: string;
  queryText?: string;
  statusFilters?: RuleExecutionStatus[];
  page?: number;
  perPage?: number;
  sortField?: keyof AggregateRuleExecutionEvent;
  sortOrder?: SortOrder;
  signal?: AbortSignal;
}): Promise<GetAggregateRuleExecutionEventsResponse> => {
  const url = detectionEngineRuleExecutionEventsUrl(ruleId);
  const startDate = dateMath.parse(start);
  const endDate = dateMath.parse(end, { roundUp: true });
  return KibanaServices.get().http.fetch<GetAggregateRuleExecutionEventsResponse>(url, {
    method: 'GET',
    query: {
      start: startDate?.utc().toISOString(),
      end: endDate?.utc().toISOString(),
      query_text: queryText,
      status_filters: statusFilters?.sort()?.join(','),
      page,
      per_page: perPage,
      sort_field: sortField,
      sort_order: sortOrder,
    },
    signal,
  });
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
