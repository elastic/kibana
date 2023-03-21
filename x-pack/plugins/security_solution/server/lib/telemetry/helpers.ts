/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { PackagePolicy } from '@kbn/fleet-plugin/common/types/models/package_policy';
import { merge } from 'lodash';
import type { Logger } from '@kbn/core/server';
import { copyAllowlistedFields, filterList } from './filterlists';
import type { PolicyConfig, PolicyData } from '../../../common/endpoint/types';
import type {
  ExceptionListItem,
  ESClusterInfo,
  ESLicense,
  ListTemplate,
  TelemetryEvent,
  ValueListResponse,
  TaskMetric,
} from './types';
import {
  LIST_DETECTION_RULE_EXCEPTION,
  LIST_ENDPOINT_EXCEPTION,
  LIST_ENDPOINT_EVENT_FILTER,
  LIST_TRUSTED_APPLICATION,
  DEFAULT_ADVANCED_POLICY_CONFIG_SETTINGS,
} from './constants';
import { tagsToEffectScope } from '../../../common/endpoint/service/trusted_apps/mapping';

/**
 * Determines the when the last run was in order to execute to.
 *
 * @param executeTo
 * @param lastExecutionTimestamp
 * @returns the timestamp to search from
 */
export const getPreviousDiagTaskTimestamp = (
  executeTo: string,
  lastExecutionTimestamp?: string
) => {
  if (lastExecutionTimestamp === undefined) {
    return moment(executeTo).subtract(5, 'minutes').toISOString();
  }

  if (moment(executeTo).diff(lastExecutionTimestamp, 'minutes') >= 10) {
    return moment(executeTo).subtract(10, 'minutes').toISOString();
  }

  return lastExecutionTimestamp;
};

/**
 * Determines the when the last run was in order to execute to.
 *
 * @param executeTo
 * @param lastExecutionTimestamp
 * @returns the timestamp to search from
 */
export const getPreviousDailyTaskTimestamp = (
  executeTo: string,
  lastExecutionTimestamp?: string
) => {
  if (lastExecutionTimestamp === undefined) {
    return moment(executeTo).subtract(24, 'hours').toISOString();
  }

  if (moment(executeTo).diff(lastExecutionTimestamp, 'hours') >= 24) {
    return moment(executeTo).subtract(24, 'hours').toISOString();
  }

  return lastExecutionTimestamp;
};

/**
 * Chunks an Array<T> into an Array<Array<T>>
 * This is to prevent overloading the telemetry channel + user resources
 *
 * @param telemetryRecords
 * @param batchSize
 * @returns the batch of records
 */
export const batchTelemetryRecords = (
  telemetryRecords: unknown[],
  batchSize: number
): unknown[][] =>
  [...Array(Math.ceil(telemetryRecords.length / batchSize))].map((_) =>
    telemetryRecords.splice(0, batchSize)
  );

/**
 * User defined type guard for PackagePolicy
 *
 * @param data the union type of package policies
 * @returns type confirmation
 */
export function isPackagePolicyList(
  data: string[] | PackagePolicy[] | undefined
): data is PackagePolicy[] {
  if (data === undefined || data.length < 1) {
    return false;
  }

  return (data as PackagePolicy[])[0].inputs !== undefined;
}

/**
 * Maps trusted application to shared telemetry object
 *
 * @param trustedAppExceptionItem
 * @returns collection of trusted applications
 */
export const trustedApplicationToTelemetryEntry = (
  trustedAppExceptionItem: ExceptionListItemSchema
) => {
  return {
    id: trustedAppExceptionItem.id,
    name: trustedAppExceptionItem.name,
    created_at: trustedAppExceptionItem.created_at,
    updated_at: trustedAppExceptionItem.updated_at,
    entries: trustedAppExceptionItem.entries,
    os_types: trustedAppExceptionItem.os_types,
    scope: tagsToEffectScope(trustedAppExceptionItem.tags),
  } as ExceptionListItem;
};

/**
 * Maps endpoint lists to shared telemetry object
 *
 * @param exceptionListItem
 * @returns collection of endpoint exceptions
 */
export const exceptionListItemToTelemetryEntry = (exceptionListItem: ExceptionListItemSchema) => {
  return {
    id: exceptionListItem.id,
    name: exceptionListItem.name,
    created_at: exceptionListItem.created_at,
    updated_at: exceptionListItem.updated_at,
    entries: exceptionListItem.entries,
    os_types: exceptionListItem.os_types,
  } as ExceptionListItem;
};

/**
 * Maps detection rule exception list items to shared telemetry object
 *
 * @param exceptionListItem
 * @param ruleVersion
 * @returns collection of detection rule exceptions
 */
export const ruleExceptionListItemToTelemetryEvent = (
  exceptionListItem: ExceptionListItemSchema,
  ruleVersion: number
) => {
  return {
    id: exceptionListItem.item_id,
    name: exceptionListItem.description,
    rule_version: ruleVersion,
    created_at: exceptionListItem.created_at,
    updated_at: exceptionListItem.updated_at,
    entries: exceptionListItem.entries,
    os_types: exceptionListItem.os_types,
  } as ExceptionListItem;
};

/**
 * Consructs the list telemetry schema from a collection of endpoint exceptions
 *
 * @param listData
 * @param listType
 * @returns lists telemetry schema
 */
export const templateExceptionList = (
  listData: ExceptionListItem[],
  clusterInfo: ESClusterInfo,
  licenseInfo: ESLicense | undefined,
  listType: string
) => {
  return listData.map((item) => {
    const template: ListTemplate = {
      '@timestamp': moment().toISOString(),
      cluster_uuid: clusterInfo.cluster_uuid,
      cluster_name: clusterInfo.cluster_name,
      license_id: licenseInfo?.uid,
    };

    // cast exception list type to a TelemetryEvent for allowlist filtering
    const filteredListItem = copyAllowlistedFields(
      filterList.exceptionLists,
      item as unknown as TelemetryEvent
    );

    if (listType === LIST_DETECTION_RULE_EXCEPTION) {
      template.detection_rule = filteredListItem;
      return template;
    }

    if (listType === LIST_TRUSTED_APPLICATION) {
      template.trusted_application = filteredListItem;
      return template;
    }

    if (listType === LIST_ENDPOINT_EXCEPTION) {
      template.endpoint_exception = filteredListItem;
      return template;
    }

    if (listType === LIST_ENDPOINT_EVENT_FILTER) {
      template.endpoint_event_filter = filteredListItem;
      return template;
    }

    return null;
  });
};

/**
 * Convert counter label list to kebab case
 *
 * @param label_list the list of labels to create standardized UsageCounter from
 * @returns a string label for usage in the UsageCounter
 */
export const createUsageCounterLabel = (labelList: string[]): string => labelList.join('-');

/**
 * Resiliantly handles an edge case where the endpoint config details are not present
 *
 * @returns the endpoint policy configuration
 */
export const extractEndpointPolicyConfig = (policyData: PolicyData | null) => {
  const epPolicyConfig = policyData?.inputs[0]?.config?.policy;
  return epPolicyConfig ? epPolicyConfig : null;
};

export const addDefaultAdvancedPolicyConfigSettings = (policyConfig: PolicyConfig) => {
  return merge(DEFAULT_ADVANCED_POLICY_CONFIG_SETTINGS, policyConfig);
};

export const formatValueListMetaData = (
  valueListResponse: ValueListResponse,
  clusterInfo: ESClusterInfo,
  licenseInfo: ESLicense | undefined
) => ({
  '@timestamp': moment().toISOString(),
  cluster_uuid: clusterInfo.cluster_uuid,
  cluster_name: clusterInfo.cluster_name,
  license_id: licenseInfo?.uid,
  total_list_count:
    valueListResponse.listMetricsResponse?.aggregations?.total_value_list_count?.value ?? 0,
  types:
    valueListResponse.listMetricsResponse?.aggregations?.type_breakdown?.buckets.map(
      (breakdown) => ({
        type: breakdown.key,
        count: breakdown.doc_count,
      })
    ) ?? [],
  lists:
    valueListResponse.itemMetricsResponse?.aggregations?.value_list_item_count?.buckets.map(
      (itemCount) => ({
        id: itemCount.key,
        count: itemCount.doc_count,
      })
    ) ?? [],
  included_in_exception_lists_count:
    valueListResponse.exceptionListMetricsResponse?.aggregations
      ?.vl_included_in_exception_lists_count?.value ?? 0,
  used_in_indicator_match_rule_count:
    valueListResponse.indicatorMatchMetricsResponse?.aggregations
      ?.vl_used_in_indicator_match_rule_count?.value ?? 0,
});

export let isElasticCloudDeployment = false;
export const setIsElasticCloudDeployment = (value: boolean) => {
  isElasticCloudDeployment = value;
};

export const tlog = (logger: Logger, message: string) => {
  if (isElasticCloudDeployment) {
    logger.info(message);
  } else {
    logger.debug(message);
  }
};

export const createTaskMetric = (
  name: string,
  passed: boolean,
  startTime: number,
  errorMessage?: string
): TaskMetric => {
  const endTime = Date.now();
  return {
    name,
    passed,
    time_executed_in_ms: endTime - startTime,
    start_time: startTime,
    end_time: endTime,
    error_message: errorMessage,
  };
};
