/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import { isEmpty } from 'lodash';
import type { Type as RuleType } from '@kbn/securitysolution-io-ts-alerting-types';
import type { SuppressedAlertService } from '@kbn/rule-registry-plugin/server';
import type {
  AlertWithCommonFieldsLatest,
  SuppressionFieldsLatest,
} from '@kbn/rule-registry-plugin/common/schemas';
import { ALERT_INSTANCE_ID } from '@kbn/rule-data-utils';

import { isQueryRule } from '../../../../../common/detection_engine/utils';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { makeFloatString } from './utils';
import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { RuleServices } from '../types';
import { createEnrichEventsFunction } from './enrichments';
import type { ExperimentalFeatures } from '../../../../../common';
import { getNumberOfSuppressedAlerts } from './get_number_of_suppressed_alerts';
import {
  isEqlBuildingBlockAlert,
  isEqlShellAlert,
} from '@kbn/security-solution-plugin/common/api/detection_engine/model/alerts/8.0.0';
import { ALERT_GROUP_ID } from '@kbn/security-solution-plugin/common/field_maps/field_names';

export interface GenericBulkCreateResponse<T extends BaseFieldsLatest> {
  success: boolean;
  bulkCreateDuration: string;
  enrichmentDuration: string;
  createdItemsCount: number;
  suppressedItemsCount: number;
  createdItems: Array<AlertWithCommonFieldsLatest<T> & { _id: string; _index: string }>;
  errors: string[];
  alertsWereTruncated: boolean;
}

export const bulkCreateWithSuppression = async <
  T extends SuppressionFieldsLatest & BaseFieldsLatest
>({
  alertWithSuppression,
  ruleExecutionLogger,
  wrappedDocs,
  buildingBlockAlerts,
  services,
  suppressionWindow,
  alertTimestampOverride,
  isSuppressionPerRuleExecution,
  maxAlerts,
  experimentalFeatures,
  ruleType,
}: {
  alertWithSuppression: SuppressedAlertService;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  wrappedDocs: Array<WrappedFieldsLatest<T>>;
  buildingBlockAlerts?: Array<WrappedFieldsLatest<BaseFieldsLatest>>;
  services: RuleServices;
  suppressionWindow: string;
  alertTimestampOverride: Date | undefined;
  isSuppressionPerRuleExecution?: boolean;
  maxAlerts?: number;
  experimentalFeatures: ExperimentalFeatures;
  ruleType?: RuleType;
}): Promise<GenericBulkCreateResponse<T>> => {
  if (wrappedDocs.length === 0) {
    return {
      errors: [],
      success: true,
      enrichmentDuration: '0',
      bulkCreateDuration: '0',
      createdItemsCount: 0,
      suppressedItemsCount: 0,
      createdItems: [],
      alertsWereTruncated: false,
    };
  }

  const start = performance.now();

  const enrichAlerts = createEnrichEventsFunction({
    services,
    logger: ruleExecutionLogger,
  });

  let enrichmentsTimeStart = 0;
  let enrichmentsTimeFinish = 0;
  const enrichAlertsWrapper: typeof enrichAlerts = async (alerts, params) => {
    enrichmentsTimeStart = performance.now();
    try {
      const enrichedAlerts = await enrichAlerts(alerts, params, experimentalFeatures);
      return enrichedAlerts;
    } catch (error) {
      ruleExecutionLogger.error(`Alerts enrichment failed: ${error}`);
      throw error;
    } finally {
      enrichmentsTimeFinish = performance.now();
    }
  };

  console.error(
    'DO WRAPPED DOCS HAVE INSTANCE IDS',
    wrappedDocs.reduce(
      (acc, doc) => ({
        ...acc,
        [doc._source[ALERT_INSTANCE_ID]]:
          acc[doc._source[ALERT_INSTANCE_ID]] != null ? acc[doc._source[ALERT_INSTANCE_ID]] + 1 : 0,
      }),
      {}
    )
  );

  let myfunc;

  if (buildingBlockAlerts != null && buildingBlockAlerts.length > 0)
    myfunc = (newAlertSource: unknown) => {
      return buildingBlockAlerts?.filter((someAlert) => {
        // console.error('SOME ALERT GROUP ID', someAlert?._source[ALERT_GROUP_ID]);
        // console.error('NEW ALERT GROUP ID', newAlerts[0]?._source[ALERT_GROUP_ID]);

        return (
          isEqlBuildingBlockAlert(someAlert?._source) &&
          isEqlShellAlert(newAlertSource) &&
          someAlert?._source?.[ALERT_GROUP_ID] === newAlertSource?.[ALERT_GROUP_ID]
        );
      });
    };

  const { createdAlerts, errors, suppressedAlerts, alertsWereTruncated } =
    await alertWithSuppression(
      wrappedDocs.map((doc) => ({
        _id: doc._id,
        // `fields` should have already been merged into `doc._source`
        _source: doc._source,
      })),
      // add building block alerts here when you get back
      suppressionWindow,
      enrichAlertsWrapper,
      alertTimestampOverride,
      isSuppressionPerRuleExecution,
      maxAlerts,
      myfunc // do the same map as wrappedDocs
    );

  const end = performance.now();

  ruleExecutionLogger.debug(`Alerts bulk process took ${makeFloatString(end - start)} ms`);

  // query rule type suppression does not happen in memory, so we can't just count createdAlerts and suppressedAlerts
  // for this rule type we need to look into alerts suppression properties, extract those values and sum up
  const suppressedItemsCount = isQueryRule(ruleType)
    ? getNumberOfSuppressedAlerts(
        createdAlerts,
        suppressedAlerts.map(({ _source, _id }) => ({ _id, ..._source }))
      )
    : suppressedAlerts.length;

  if (!isEmpty(errors)) {
    ruleExecutionLogger.warn(`Alerts bulk process finished with errors: ${JSON.stringify(errors)}`);
    return {
      errors: Object.keys(errors),
      success: false,
      enrichmentDuration: makeFloatString(enrichmentsTimeFinish - enrichmentsTimeStart),
      bulkCreateDuration: makeFloatString(end - start),
      createdItemsCount: createdAlerts.length,
      createdItems: createdAlerts,
      suppressedItemsCount,
      alertsWereTruncated,
    };
  } else {
    return {
      errors: [],
      success: true,
      bulkCreateDuration: makeFloatString(end - start),
      enrichmentDuration: makeFloatString(enrichmentsTimeFinish - enrichmentsTimeStart),
      createdItemsCount: createdAlerts.length,
      createdItems: createdAlerts,
      suppressedItemsCount,
      alertsWereTruncated,
    };
  }
};
