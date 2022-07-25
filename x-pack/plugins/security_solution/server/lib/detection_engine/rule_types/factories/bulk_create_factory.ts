/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import { isEmpty } from 'lodash';

import type { Logger } from '@kbn/core/server';
import type { PersistenceAlertService } from '@kbn/rule-registry-plugin/server';
import type { AlertWithCommonFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import type { BuildRuleMessage } from '../../signals/rule_messages';
import { makeFloatString } from '../../signals/utils';
import type { RefreshTypes } from '../../types';
import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/detection_engine/schemas/alerts';

export interface GenericBulkCreateResponse<T extends BaseFieldsLatest> {
  success: boolean;
  bulkCreateDuration: string;
  createdItemsCount: number;
  createdItems: Array<AlertWithCommonFieldsLatest<T> & { _id: string; _index: string }>;
  errors: string[];
  alertsWereTruncated: boolean;
}

export const bulkCreateFactory =
  (
    logger: Logger,
    alertWithPersistence: PersistenceAlertService,
    buildRuleMessage: BuildRuleMessage,
    refreshForBulkCreate: RefreshTypes
  ) =>
  async <T extends BaseFieldsLatest>(
    wrappedDocs: Array<WrappedFieldsLatest<T>>,
    maxAlerts?: number
  ): Promise<GenericBulkCreateResponse<T>> => {
    if (wrappedDocs.length === 0) {
      return {
        errors: [],
        success: true,
        bulkCreateDuration: '0',
        createdItemsCount: 0,
        createdItems: [],
        alertsWereTruncated: false,
      };
    }

    const start = performance.now();

    const { createdAlerts, errors, alertsWereTruncated } = await alertWithPersistence(
      wrappedDocs.map((doc) => ({
        _id: doc._id,
        // `fields` should have already been merged into `doc._source`
        _source: doc._source,
      })),
      refreshForBulkCreate,
      maxAlerts
    );

    const end = performance.now();

    logger.debug(
      buildRuleMessage(
        `individual bulk process time took: ${makeFloatString(end - start)} milliseconds`
      )
    );

    if (!isEmpty(errors)) {
      logger.debug(
        buildRuleMessage(`[-] bulkResponse had errors with responses of: ${JSON.stringify(errors)}`)
      );
      return {
        errors: Object.keys(errors),
        success: false,
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
        createdItemsCount: createdAlerts.length,
        createdItems: createdAlerts,
        alertsWereTruncated,
      };
    }
  };
