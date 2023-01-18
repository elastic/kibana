/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import { isEmpty } from 'lodash';

import type { SuppressedAlertService } from '@kbn/rule-registry-plugin/server';
import type {
  AlertWithCommonFieldsLatest,
  SuppressionFieldsLatest,
} from '@kbn/rule-registry-plugin/common/schemas';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { makeFloatString } from '../../signals/utils';
import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/detection_engine/schemas/alerts';
import type { RuleServices } from '../../signals/types';
import { createEnrichEventsFunction } from '../../signals/enrichments';

export interface GenericBulkCreateResponse<T extends BaseFieldsLatest> {
  success: boolean;
  bulkCreateDuration: string;
  enrichmentDuration: string;
  createdItemsCount: number;
  createdItems: Array<AlertWithCommonFieldsLatest<T> & { _id: string; _index: string }>;
  errors: string[];
}

export const bulkCreateWithSuppression = async <
  T extends SuppressionFieldsLatest & BaseFieldsLatest
>({
  alertWithSuppression,
  ruleExecutionLogger,
  wrappedDocs,
  services,
  suppressionWindow,
  alertTimestampOverride,
}: {
  alertWithSuppression: SuppressedAlertService;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  wrappedDocs: Array<WrappedFieldsLatest<T>>;
  services: RuleServices;
  suppressionWindow: string;
  alertTimestampOverride: Date | undefined;
}): Promise<GenericBulkCreateResponse<T>> => {
  if (wrappedDocs.length === 0) {
    return {
      errors: [],
      success: true,
      enrichmentDuration: '0',
      bulkCreateDuration: '0',
      createdItemsCount: 0,
      createdItems: [],
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
      const enrichedAlerts = await enrichAlerts(alerts, params);
      return enrichedAlerts;
    } catch (error) {
      ruleExecutionLogger.error(`Enrichments failed ${error}`);
      throw error;
    } finally {
      enrichmentsTimeFinish = performance.now();
    }
  };

  const { createdAlerts, errors } = await alertWithSuppression(
    wrappedDocs.map((doc) => ({
      _id: doc._id,
      // `fields` should have already been merged into `doc._source`
      _source: doc._source,
    })),
    suppressionWindow,
    enrichAlertsWrapper,
    alertTimestampOverride
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
    };
  } else {
    return {
      errors: [],
      success: true,
      bulkCreateDuration: makeFloatString(end - start),
      enrichmentDuration: makeFloatString(enrichmentsTimeFinish - enrichmentsTimeStart),
      createdItemsCount: createdAlerts.length,
      createdItems: createdAlerts,
    };
  }
};
