/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateRuleExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { INTERNAL_ALERTING_API_FIND_RULES_PATH } from '@kbn/alerting-plugin/common';
import { BASE_ACTION_API_PATH } from '@kbn/actions-plugin/common';
import type { ActionType, AsApiContract } from '@kbn/actions-plugin/common';
import type { ActionResult } from '@kbn/actions-plugin/server';
import type { BulkInstallPackagesResponse } from '@kbn/fleet-plugin/common';
import { epmRouteService } from '@kbn/fleet-plugin/common';
import type { InstallPackageResponse } from '@kbn/fleet-plugin/common/types';
import { convertRulesFilterToKQL } from '../../../../common/detection_engine/rule_management/rule_filtering';
import type {
  UpgradeSpecificRulesRequest,
  PerformRuleUpgradeResponseBody,
  InstallSpecificRulesRequest,
  PerformRuleInstallationResponseBody,
  GetPrebuiltRulesStatusResponseBody,
  ReviewRuleUpgradeResponseBody,
  ReviewRuleInstallationResponseBody,
} from '../../../../common/api/detection_engine/prebuilt_rules';
import type {
  CoverageOverviewResponse,
  GetRuleManagementFiltersResponse,
} from '../../../../common/api/detection_engine/rule_management';
import {
  RULE_MANAGEMENT_FILTERS_URL,
  RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL,
} from '../../../../common/api/detection_engine/rule_management';
import type { BulkActionsDryRunErrCode } from '../../../../common/constants';
import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_PREVIEW,
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_RULES_URL_FIND,
} from '../../../../common/constants';

import {
  GET_PREBUILT_RULES_STATUS_URL,
  PERFORM_RULE_INSTALLATION_URL,
  PERFORM_RULE_UPGRADE_URL,
  PREBUILT_RULES_STATUS_URL,
  REVIEW_RULE_INSTALLATION_URL,
  REVIEW_RULE_UPGRADE_URL,
} from '../../../../common/api/detection_engine/prebuilt_rules';

import type { RulesReferencedByExceptionListsSchema } from '../../../../common/api/detection_engine/rule_exceptions';
import { DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL } from '../../../../common/api/detection_engine/rule_exceptions';

import type {
  BulkActionDuplicatePayload,
  BulkActionEditPayload,
} from '../../../../common/api/detection_engine/rule_management/bulk_actions/bulk_actions_route';
import { BulkActionType } from '../../../../common/api/detection_engine/rule_management/bulk_actions/bulk_actions_route';
import type { PreviewResponse, RuleResponse } from '../../../../common/api/detection_engine';

import { KibanaServices } from '../../../common/lib/kibana';
import * as i18n from '../../../detections/pages/detection_engine/rules/translations';
import type {
  CreateRulesProps,
  ExportDocumentsProps,
  FetchCoverageOverviewProps,
  FetchRuleProps,
  FetchRuleSnoozingProps,
  FetchRulesProps,
  FetchRulesResponse,
  FindRulesReferencedByExceptionsProps,
  ImportDataProps,
  ImportDataResponse,
  PatchRuleProps,
  PrePackagedRulesStatusResponse,
  PreviewRulesProps,
  RulesSnoozeSettingsBatchResponse,
  RulesSnoozeSettingsMap,
  UpdateRulesProps,
} from '../logic/types';

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
    version: '2023-10-31',
    body: JSON.stringify(rule),
    signal,
  });

/**
 * Update provided Rule using PUT
 *
 * @param rule RuleUpdateProps to be updated
 * @param signal to cancel request
 *
 * @returns Promise<RuleResponse> An updated rule
 *
 * In fact this function should return Promise<RuleResponse> but it'd require massive refactoring.
 * It should be addressed as a part of OpenAPI schema adoption.
 *
 * @throws An error if response is not OK
 */
export const updateRule = async ({ rule, signal }: UpdateRulesProps): Promise<RuleResponse> =>
  KibanaServices.get().http.fetch<RuleResponse>(DETECTION_ENGINE_RULES_URL, {
    method: 'PUT',
    version: '2023-10-31',
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
    version: '2023-10-31',
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
    version: '2023-10-31',
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
  const kql = convertRulesFilterToKQL(filterOptions);

  const query = {
    page: pagination.page,
    per_page: pagination.perPage,
    sort_field: sortingOptions.field,
    sort_order: sortingOptions.order,
    ...(kql !== '' ? { filter: kql } : {}),
  };

  return KibanaServices.get().http.fetch<FetchRulesResponse>(DETECTION_ENGINE_RULES_URL_FIND, {
    method: 'GET',
    version: '2023-10-31',
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
 * @returns Promise<RuleResponse>
 *
 * In fact this function should return Promise<RuleResponse> but it'd require massive refactoring.
 * It should be addressed as a part of OpenAPI schema adoption.
 *
 * @throws An error if response is not OK
 */
export const fetchRuleById = async ({ id, signal }: FetchRuleProps): Promise<RuleResponse> =>
  KibanaServices.get().http.fetch<RuleResponse>(DETECTION_ENGINE_RULES_URL, {
    method: 'GET',
    version: '2023-10-31',
    query: { id },
    signal,
  });

/**
 * Fetch rule snooze settings for each provided ruleId
 *
 * @param ids Rule IDs (not rule_id)
 * @param signal to cancel request
 *
 * @returns An error if response is not OK
 */
export const fetchRulesSnoozeSettings = async ({
  ids,
  signal,
}: FetchRuleSnoozingProps): Promise<RulesSnoozeSettingsMap> => {
  const response = await KibanaServices.get().http.fetch<RulesSnoozeSettingsBatchResponse>(
    INTERNAL_ALERTING_API_FIND_RULES_PATH,
    {
      method: 'GET',
      query: {
        filter: ids.map((x) => `alert.id:"alert:${x}"`).join(' or '),
        fields: JSON.stringify(['muteAll', 'activeSnoozes', 'isSnoozedUntil', 'snoozeSchedule']),
        per_page: ids.length,
      },
      signal,
    }
  );

  return response.data?.reduce((result, { id, ...snoozeSettings }) => {
    result[id] = {
      muteAll: snoozeSettings.mute_all ?? false,
      activeSnoozes: snoozeSettings.active_snoozes ?? [],
      isSnoozedUntil: snoozeSettings.is_snoozed_until
        ? new Date(snoozeSettings.is_snoozed_until)
        : undefined,
      snoozeSchedule: snoozeSettings.snooze_schedule,
    };

    return result;
  }, {} as RulesSnoozeSettingsMap);
};

export const fetchConnectors = (
  signal?: AbortSignal
): Promise<Array<AsApiContract<ActionResult>>> =>
  KibanaServices.get().http.fetch(`${BASE_ACTION_API_PATH}/connectors`, { method: 'GET', signal });

export const fetchCoverageOverview = async ({
  filter,
  signal,
}: FetchCoverageOverviewProps): Promise<CoverageOverviewResponse> =>
  KibanaServices.get().http.fetch<CoverageOverviewResponse>(RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL, {
    method: 'POST',
    version: '1',
    body: JSON.stringify({
      filter,
    }),
    signal,
  });

export const fetchConnectorTypes = (signal?: AbortSignal): Promise<ActionType[]> =>
  KibanaServices.get().http.fetch(`${BASE_ACTION_API_PATH}/connector_types`, {
    method: 'GET',
    signal,
    query: {
      feature_id: 'siem',
    },
  });

export interface BulkActionSummary {
  failed: number;
  skipped: number;
  succeeded: number;
  total: number;
}

export interface BulkActionResult {
  updated: RuleResponse[];
  created: RuleResponse[];
  deleted: RuleResponse[];
  skipped: RuleResponse[];
}

export interface BulkActionAggregatedError {
  message: string;
  status_code: number;
  err_code?: BulkActionsDryRunErrCode;
  rules: Array<{ id: string; name?: string }>;
}

export interface BulkActionAttributes {
  summary: BulkActionSummary;
  results: BulkActionResult;
  errors?: BulkActionAggregatedError[];
}

export interface BulkActionResponse {
  success?: boolean;
  rules_count?: number;
  attributes: BulkActionAttributes;
}

export interface BulkActionErrorResponse {
  message: string;
  status_code: number;
  attributes?: BulkActionAttributes;
}

export type QueryOrIds = { query: string; ids?: undefined } | { query?: undefined; ids: string[] };
type PlainBulkAction = {
  type: Exclude<
    BulkActionType,
    BulkActionType.edit | BulkActionType.export | BulkActionType.duplicate
  >;
} & QueryOrIds;

type EditBulkAction = {
  type: BulkActionType.edit;
  editPayload: BulkActionEditPayload[];
} & QueryOrIds;

type DuplicateBulkAction = {
  type: BulkActionType.duplicate;
  duplicatePayload?: BulkActionDuplicatePayload;
} & QueryOrIds;

export type BulkAction = PlainBulkAction | EditBulkAction | DuplicateBulkAction;

export interface PerformBulkActionProps {
  bulkAction: BulkAction;
  dryRun?: boolean;
}

/**
 * Perform bulk action with rules selected by a filter query
 *
 * @param bulkAction bulk action which contains type, query or ids and edit fields
 * @param dryRun enables dry run mode for bulk actions
 *
 * @throws An error if response is not OK
 */
export async function performBulkAction({
  bulkAction,
  dryRun = false,
}: PerformBulkActionProps): Promise<BulkActionResponse> {
  const params = {
    action: bulkAction.type,
    query: bulkAction.query,
    ids: bulkAction.ids,
    edit: bulkAction.type === BulkActionType.edit ? bulkAction.editPayload : undefined,
    duplicate:
      bulkAction.type === BulkActionType.duplicate ? bulkAction.duplicatePayload : undefined,
  };

  return KibanaServices.get().http.fetch<BulkActionResponse>(DETECTION_ENGINE_RULES_BULK_ACTION, {
    method: 'POST',
    version: '2023-10-31',
    body: JSON.stringify(params),
    query: { dry_run: dryRun },
  });
}

export type BulkExportResponse = Blob;

/**
 * Bulk export rules selected by a filter query
 *
 * @param queryOrIds filter query to select rules to perform bulk action with or rule ids to select rules to perform bulk action with
 *
 * @throws An error if response is not OK
 */
export async function bulkExportRules(queryOrIds: QueryOrIds): Promise<BulkExportResponse> {
  const params = {
    action: BulkActionType.export,
    query: queryOrIds.query,
    ids: queryOrIds.ids,
  };

  return KibanaServices.get().http.fetch<BulkExportResponse>(DETECTION_ENGINE_RULES_BULK_ACTION, {
    method: 'POST',
    version: '2023-10-31',
    body: JSON.stringify(params),
  });
}

export interface CreatePrepackagedRulesResponse {
  rules_installed: number;
  rules_updated: number;
  timelines_installed: number;
  timelines_updated: number;
}

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
  overwriteActionConnectors = false,
  signal,
}: ImportDataProps): Promise<ImportDataResponse> => {
  const formData = new FormData();
  formData.append('file', fileToImport);

  return KibanaServices.get().http.fetch<ImportDataResponse>(
    `${DETECTION_ENGINE_RULES_URL}/_import`,
    {
      method: 'POST',
      version: '2023-10-31',
      headers: { 'Content-Type': undefined },
      query: {
        overwrite,
        overwrite_exceptions: overwriteExceptions,
        overwrite_action_connectors: overwriteActionConnectors,
      },
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
    version: '2023-10-31',
    body,
    query: {
      exclude_export_details: excludeExportDetails,
      file_name: filename,
    },
    signal,
  });
};

/**
 * Fetch rule filters related information like installed rules count, tags and etc
 *
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchRuleManagementFilters = async ({
  signal,
}: {
  signal?: AbortSignal;
}): Promise<GetRuleManagementFiltersResponse> =>
  KibanaServices.get().http.fetch<GetRuleManagementFiltersResponse>(RULE_MANAGEMENT_FILTERS_URL, {
    method: 'GET',
    version: '1',
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
  signal?: AbortSignal;
}): Promise<PrePackagedRulesStatusResponse> =>
  KibanaServices.get().http.fetch<PrePackagedRulesStatusResponse>(PREBUILT_RULES_STATUS_URL, {
    method: 'GET',
    version: '2023-10-31',
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
      version: '1',
      query,
      signal,
    }
  );
};

/**
 * Add exception items to default rule exception list
 *
 * @param ruleId `id` of rule to add items to
 * @param items CreateRuleExceptionListItemSchema[]
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const addRuleExceptions = async ({
  ruleId,
  items,
  signal,
}: {
  ruleId: string;
  items: CreateRuleExceptionListItemSchema[];
  signal: AbortSignal | undefined;
}): Promise<ExceptionListItemSchema[]> =>
  KibanaServices.get().http.fetch<ExceptionListItemSchema[]>(
    `${DETECTION_ENGINE_RULES_URL}/${ruleId}/exceptions`,
    {
      method: 'POST',
      version: '2023-10-31',
      body: JSON.stringify({ items }),
      signal,
    }
  );

export interface InstallFleetPackageProps {
  packageName: string;
  packageVersion: string;
  prerelease?: boolean;
  force?: boolean;
}

/**
 * Install a Fleet package from the registry
 *
 * @param packageName Name of the package to install
 * @param packageVersion Version of the package to install
 * @param prerelease Whether to install a prerelease version of the package
 * @param force Whether to force install the package. If false, the package will only be installed if it is not already installed
 *
 * @returns The response from the Fleet API
 */
export const installFleetPackage = ({
  packageName,
  packageVersion,
  prerelease = false,
  force = true,
}: InstallFleetPackageProps): Promise<InstallPackageResponse> => {
  return KibanaServices.get().http.post<InstallPackageResponse>(
    epmRouteService.getInstallPath(packageName, packageVersion),
    {
      query: { prerelease },
      version: '2023-10-31',
      body: JSON.stringify({ force }),
    }
  );
};

export interface BulkInstallFleetPackagesProps {
  packages: string[];
  prerelease?: boolean;
}

/**
 * Install multiple Fleet packages from the registry
 *
 * @param packages Array of package names to install
 * @param prerelease Whether to install prerelease versions of the packages
 *
 * @returns The response from the Fleet API
 */
export const bulkInstallFleetPackages = ({
  packages,
  prerelease = false,
}: BulkInstallFleetPackagesProps): Promise<BulkInstallPackagesResponse> => {
  return KibanaServices.get().http.post<BulkInstallPackagesResponse>(
    epmRouteService.getBulkInstallPath(),
    {
      query: { prerelease },
      version: '2023-10-31',
      body: JSON.stringify({ packages }),
    }
  );
};

/**
 * NEW PREBUILT RULES ROUTES START HERE! 👋
 * USE THESE ONES! THEY'RE THE NICE ONES, PROMISE!
 */

/**
 * Get prebuilt rules status
 *
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const getPrebuiltRulesStatus = async ({
  signal,
}: {
  signal: AbortSignal | undefined;
}): Promise<GetPrebuiltRulesStatusResponseBody> =>
  KibanaServices.get().http.fetch<GetPrebuiltRulesStatusResponseBody>(
    GET_PREBUILT_RULES_STATUS_URL,
    {
      method: 'GET',
      version: '1',
      signal,
    }
  );

/**
 * Review prebuilt rules upgrade
 *
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const reviewRuleUpgrade = async ({
  signal,
}: {
  signal: AbortSignal | undefined;
}): Promise<ReviewRuleUpgradeResponseBody> =>
  KibanaServices.get().http.fetch(REVIEW_RULE_UPGRADE_URL, {
    method: 'POST',
    version: '1',
    signal,
  });

/**
 * Review prebuilt rules install (new rules)
 *
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const reviewRuleInstall = async ({
  signal,
}: {
  signal: AbortSignal | undefined;
}): Promise<ReviewRuleInstallationResponseBody> =>
  KibanaServices.get().http.fetch(REVIEW_RULE_INSTALLATION_URL, {
    method: 'POST',
    version: '1',
    signal,
  });

export const performInstallAllRules = async (): Promise<PerformRuleInstallationResponseBody> =>
  KibanaServices.get().http.fetch(PERFORM_RULE_INSTALLATION_URL, {
    method: 'POST',
    version: '1',
    body: JSON.stringify({
      mode: 'ALL_RULES',
    }),
  });

export const performInstallSpecificRules = async (
  rules: InstallSpecificRulesRequest['rules']
): Promise<PerformRuleInstallationResponseBody> =>
  KibanaServices.get().http.fetch(PERFORM_RULE_INSTALLATION_URL, {
    method: 'POST',
    version: '1',
    body: JSON.stringify({
      mode: 'SPECIFIC_RULES',
      rules,
    }),
  });

export const performUpgradeAllRules = async (): Promise<PerformRuleUpgradeResponseBody> =>
  KibanaServices.get().http.fetch(PERFORM_RULE_UPGRADE_URL, {
    method: 'POST',
    version: '1',
    body: JSON.stringify({
      mode: 'ALL_RULES',
      pick_version: 'TARGET',
    }),
  });

export const performUpgradeSpecificRules = async (
  rules: UpgradeSpecificRulesRequest['rules']
): Promise<PerformRuleUpgradeResponseBody> =>
  KibanaServices.get().http.fetch(PERFORM_RULE_UPGRADE_URL, {
    method: 'POST',
    version: '1',
    body: JSON.stringify({
      mode: 'SPECIFIC_RULES',
      rules,
      pick_version: 'TARGET', // Setting fixed 'TARGET' temporarily for Milestone 2
    }),
  });
