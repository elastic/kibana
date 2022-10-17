/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { camelCase } from 'lodash';

import type { BulkActionsDryRunErrCode } from '../../../../common/constants';
import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_PREVIEW,
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_RULES_URL_FIND,
  DETECTION_ENGINE_TAGS_URL,
} from '../../../../common/constants';

import {
  PREBUILT_RULES_STATUS_URL,
  PREBUILT_RULES_URL,
} from '../../../../common/detection_engine/prebuilt_rules';

import type { RulesReferencedByExceptionListsSchema } from '../../../../common/detection_engine/rule_exceptions';
import { DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL } from '../../../../common/detection_engine/rule_exceptions';

import type { BulkActionEditPayload } from '../../../../common/detection_engine/rule_management';
import { BulkAction } from '../../../../common/detection_engine/rule_management';

import type {
  RuleResponse,
  PreviewResponse,
} from '../../../../common/detection_engine/rule_schema';

import { KibanaServices } from '../../../common/lib/kibana';
import * as i18n from '../../../detections/pages/detection_engine/rules/translations';
import type {
  CreateRulesProps,
  ExportDocumentsProps,
  FetchRuleProps,
  FetchRulesProps,
  FetchRulesResponse,
  FindRulesReferencedByExceptionsProps,
  ImportDataProps,
  ImportDataResponse,
  PatchRuleProps,
  PrePackagedRulesStatusResponse,
  PreviewRulesProps,
  Rule,
  UpdateRulesProps,
} from '../logic/types';
import { convertRulesFilterToKQL } from '../logic/utils';

/**
 * Create provided Rule
 *
 * @param rule RuleCreateProps to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const createRule = async ({ rule, signal }: CreateRulesProps): Promise<RuleResponse> =>
  KibanaServices.get().http.fetch<RuleResponse>(DETECTION_ENGINE_RULES_URL, {
    method: 'POST',
    body: JSON.stringify(rule),
    signal,
  });

/**
 * Update provided Rule using PUT
 *
 * @param rule RuleUpdateProps to be updated
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const updateRule = async ({ rule, signal }: UpdateRulesProps): Promise<RuleResponse> =>
  KibanaServices.get().http.fetch<RuleResponse>(DETECTION_ENGINE_RULES_URL, {
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
export const patchRule = async ({
  ruleProperties,
  signal,
}: PatchRuleProps): Promise<RuleResponse> =>
  KibanaServices.get().http.fetch<RuleResponse>(DETECTION_ENGINE_RULES_URL, {
    method: 'PATCH',
    body: JSON.stringify(ruleProperties),
    signal,
  });

/**
 * Preview provided Rule
 *
 * @param rule RuleCreateProps to add
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

  return KibanaServices.get().http.fetch<FetchRulesResponse>(DETECTION_ENGINE_RULES_URL_FIND, {
    method: 'GET',
    query,
    signal,
  });
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
  KibanaServices.get().http.fetch<Rule>(DETECTION_ENGINE_RULES_URL, {
    method: 'GET',
    query: { id },
    signal,
  });

export interface BulkActionSummary {
  failed: number;
  succeeded: number;
  total: number;
}

export interface BulkActionResult {
  updated: Rule[];
  created: Rule[];
  deleted: Rule[];
}

export interface BulkActionAggregatedError {
  message: string;
  status_code: number;
  err_code?: BulkActionsDryRunErrCode;
  rules: Array<{ id: string; name?: string }>;
}

export interface BulkActionResponse {
  success?: boolean;
  rules_count?: number;
  attributes: {
    summary: BulkActionSummary;
    results: BulkActionResult;
    errors?: BulkActionAggregatedError[];
  };
}

export interface BulkActionProps {
  action: Exclude<BulkAction, BulkAction.export>;
  query?: string;
  ids?: string[];
  edit?: BulkActionEditPayload[];
  isDryRun?: boolean;
}

/**
 * Perform bulk action with rules selected by a filter query
 *
 * @param query filter query to select rules to perform bulk action with
 * @param ids string[] rule ids to select rules to perform bulk action with
 * @param edit BulkEditActionPayload edit action payload
 * @param action bulk action to perform
 * @param isDryRun enables dry run mode for bulk actions
 *
 * @throws An error if response is not OK
 */
export const performBulkAction = async ({
  action,
  query,
  edit,
  ids,
  isDryRun,
}: BulkActionProps): Promise<BulkActionResponse> =>
  KibanaServices.get().http.fetch<BulkActionResponse>(DETECTION_ENGINE_RULES_BULK_ACTION, {
    method: 'POST',
    body: JSON.stringify({
      action,
      ...(edit ? { edit } : {}),
      ...(ids ? { ids } : {}),
      ...(query !== undefined ? { query } : {}),
    }),
    query: {
      ...(isDryRun ? { dry_run: isDryRun } : {}),
    },
  });

export interface BulkExportProps {
  query?: string;
  ids?: string[];
}

export type BulkExportResponse = Blob;

/**
 * Bulk export rules selected by a filter query
 *
 * @param query filter query to select rules to perform bulk action with
 * @param ids string[] rule ids to select rules to perform bulk action with
 *
 * @throws An error if response is not OK
 */
export const bulkExportRules = async ({
  query,
  ids,
}: BulkExportProps): Promise<BulkExportResponse> =>
  KibanaServices.get().http.fetch<BulkExportResponse>(DETECTION_ENGINE_RULES_BULK_ACTION, {
    method: 'POST',
    body: JSON.stringify({
      action: BulkAction.export,
      ...(ids ? { ids } : {}),
      ...(query !== undefined ? { query } : {}),
    }),
  });

export interface CreatePrepackagedRulesResponse {
  rules_installed: number;
  rules_updated: number;
  timelines_installed: number;
  timelines_updated: number;
}

/**
 * Create Prepackaged Rules
 *
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const createPrepackagedRules = async (): Promise<CreatePrepackagedRulesResponse> => {
  const result = await KibanaServices.get().http.fetch<{
    rules_installed: number;
    rules_updated: number;
    timelines_installed: number;
    timelines_updated: number;
  }>(PREBUILT_RULES_URL, {
    method: 'PUT',
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

export type FetchTagsResponse = string[];

/**
 * Fetch all unique Tags used by Rules
 *
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchTags = async ({ signal }: { signal?: AbortSignal }): Promise<FetchTagsResponse> =>
  KibanaServices.get().http.fetch<FetchTagsResponse>(DETECTION_ENGINE_TAGS_URL, {
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
  signal: AbortSignal | undefined;
}): Promise<PrePackagedRulesStatusResponse> =>
  KibanaServices.get().http.fetch<PrePackagedRulesStatusResponse>(PREBUILT_RULES_STATUS_URL, {
    method: 'GET',
    signal,
  });

/**
 * Fetch info on what exceptions lists are referenced by what rules
 *
 * @param lists exception list information needed for making request
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const findRuleExceptionReferences = async ({
  lists,
  signal,
}: FindRulesReferencedByExceptionsProps): Promise<RulesReferencedByExceptionListsSchema> => {
  const idsUndefined = lists.some(({ id }) => id === undefined);
  const query = idsUndefined
    ? {
        namespace_types: lists.map(({ namespaceType }) => namespaceType).join(','),
      }
    : {
        ids: lists.map(({ id }) => id).join(','),
        list_ids: lists.map(({ listId }) => listId).join(','),
        namespace_types: lists.map(({ namespaceType }) => namespaceType).join(','),
      };
  return KibanaServices.get().http.fetch<RulesReferencedByExceptionListsSchema>(
    DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL,
    {
      method: 'GET',
      query,
      signal,
    }
  );
};
