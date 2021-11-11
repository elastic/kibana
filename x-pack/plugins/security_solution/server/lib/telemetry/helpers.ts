/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { PackagePolicy } from '../../../../fleet/common/types/models/package_policy';
import { copyAllowlistedFields, exceptionListEventFields } from './filters';
import { ExceptionListItem, ListTemplate, TelemetryEvent } from './types';
import {
  LIST_DETECTION_RULE_EXCEPTION,
  LIST_ENDPOINT_EXCEPTION,
  LIST_ENDPOINT_EVENT_FILTER,
  LIST_TRUSTED_APPLICATION,
} from './constants';
import { TrustedApp } from '../../../common/endpoint/types';

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
 * @param exceptionListItem
 * @returns collection of trusted applications
 */
export const trustedApplicationToTelemetryEntry = (trustedApplication: TrustedApp) => {
  return {
    id: trustedApplication.id,
    name: trustedApplication.name,
    created_at: trustedApplication.created_at,
    updated_at: trustedApplication.updated_at,
    entries: trustedApplication.entries,
    os_types: [trustedApplication.os],
    scope: trustedApplication.effectScope,
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
export const templateExceptionList = (listData: ExceptionListItem[], listType: string) => {
  return listData.map((item) => {
    const template: ListTemplate = {
      '@timestamp': moment().toISOString(),
    };

    // cast exception list type to a TelemetryEvent for allowlist filtering
    const filteredListItem = copyAllowlistedFields(
      exceptionListEventFields,
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
export function createUsageCounterLabel(labelList: string[]): string {
  return labelList.join('-');
}
