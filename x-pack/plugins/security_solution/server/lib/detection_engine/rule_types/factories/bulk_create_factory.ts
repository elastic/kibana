/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import { isEmpty } from 'lodash';

import type { PersistenceAlertService } from '@kbn/rule-registry-plugin/server';
import type { AlertWithCommonFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { makeFloatString } from '../utils/utils';
import type { RefreshTypes } from '../../types';
import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/detection_engine/schemas/alerts';

export interface GenericBulkCreateResponse<T extends BaseFieldsLatest> {
  success: boolean;
  bulkCreateDuration: string;
  enrichmentDuration: string;
  createdItemsCount: number;
  createdItems: Array<AlertWithCommonFieldsLatest<T> & { _id: string; _index: string }>;
  errors: string[];
  alertsWereTruncated: boolean;
}

export const bulkCreateFactory =
  (
    alertWithPersistence: PersistenceAlertService,
    refreshForBulkCreate: RefreshTypes,
    ruleExecutionLogger: IRuleExecutionLogForExecutors
  ) =>
  async <T extends BaseFieldsLatest>(
    wrappedDocs: Array<WrappedFieldsLatest<T>>,
    maxAlerts?: number,
    enrichAlerts?: (
      alerts: Array<Pick<WrappedFieldsLatest<T>, '_id' | '_source'>>,
      params: { spaceId: string }
    ) => Promise<Array<Pick<WrappedFieldsLatest<T>, '_id' | '_source'>>>
  ): Promise<GenericBulkCreateResponse<T>> => {
    if (wrappedDocs.length === 0) {
      return {
        errors: [],
        success: true,
        enrichmentDuration: '0',
        bulkCreateDuration: '0',
        createdItemsCount: 0,
        createdItems: [],
        alertsWereTruncated: false,
      };
    }

    const start = performance.now();

    let enrichmentsTimeStart = 0;
    let enrichmentsTimeFinish = 0;
    let enrichAlertsWrapper: typeof enrichAlerts;
    if (enrichAlerts) {
      enrichAlertsWrapper = async (alerts, params) => {
        enrichmentsTimeStart = performance.now();
        try {
          const enrichedAlerts = await enrichAlerts(alerts, params);
          return enrichedAlerts;
        } catch (error) {
          ruleExecutionLogger.error(`Enrichments failed ${error}`);
          throw error;
        } finally {
          enrichmentsTimeFinish = performance.now();
        }
      };
    }

    const { createdAlerts, errors, alertsWereTruncated } = await alertWithPersistence(
      wrappedDocs.map((doc) => ({
        _id: doc._id,
        // `fields` should have already been merged into `doc._source`
        _source: doc._source,
      })),
      refreshForBulkCreate,
      maxAlerts,
      enrichAlertsWrapper
    );

    const end = performance.now();

    ruleExecutionLogger.debug(
      `individual bulk process time took: ${makeFloatString(end - start)} milliseconds`
    );

    if (!isEmpty(errors)) {
      ruleExecutionLogger.debug(
        `[-] bulkResponse had errors with responses of: ${JSON.stringify(errors)}`
      );
      return {
        errors: Object.keys(errors),
        success: false,
        enrichmentDuration: makeFloatString(enrichmentsTimeFinish - enrichmentsTimeStart),
        bulkCreateDuration: makeFloatString(end - start),
        createdItemsCount: createdAlerts.length,
        createdItems: createdAlerts,
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
        alertsWereTruncated,
      };
    }
  };
