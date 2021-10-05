/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_INSTANCE_ID } from '@kbn/rule-data-utils';

import { performance } from 'perf_hooks';
import { countBy, isEmpty } from 'lodash';

import { Logger } from 'kibana/server';
import { BaseHit } from '../../../../../common/detection_engine/types';
import { BuildRuleMessage } from '../../signals/rule_messages';
import { errorAggregator, makeFloatString } from '../../signals/utils';
import { RefreshTypes } from '../../types';
import { PersistenceAlertService } from '../../../../../../rule_registry/server';

export interface GenericBulkCreateResponse<T> {
  success: boolean;
  bulkCreateDuration: string;
  createdItemsCount: number;
  createdItems: Array<T & { _id: string; _index: string }>;
  errors: string[];
}

export const bulkCreateFactory =
  (
    logger: Logger,
    alertWithPersistence: PersistenceAlertService,
    buildRuleMessage: BuildRuleMessage,
    refreshForBulkCreate: RefreshTypes
  ) =>
  async <T>(wrappedDocs: Array<BaseHit<T>>): Promise<GenericBulkCreateResponse<T>> => {
    if (wrappedDocs.length === 0) {
      return {
        errors: [],
        success: true,
        bulkCreateDuration: '0',
        createdItemsCount: 0,
        createdItems: [],
      };
    }

    const start = performance.now();

    const response = await alertWithPersistence(
      wrappedDocs.map((doc) => ({
        id: doc._id,
        fields: doc.fields ?? doc._source ?? {},
      })),
      refreshForBulkCreate
    );

    const end = performance.now();

    logger.debug(
      buildRuleMessage(
        `individual bulk process time took: ${makeFloatString(end - start)} milliseconds`
      )
    );

    if (response == null) {
      return {
        errors: [
          'alertWithPersistence returned undefined response. Alerts as Data write flag may be disabled.',
        ],
        success: false,
        bulkCreateDuration: makeFloatString(end - start),
        createdItemsCount: 0,
        createdItems: [],
      };
    }

    logger.debug(
      buildRuleMessage(`took property says bulk took: ${response.body.took} milliseconds`)
    );

    const createdItems = wrappedDocs
      .map((doc, index) => {
        const responseIndex = response.body.items[index].index;
        return {
          _id: responseIndex?._id ?? '',
          _index: responseIndex?._index ?? '',
          [ALERT_INSTANCE_ID]: responseIndex?._id ?? '',
          ...doc._source,
        };
      })
      .filter((_, index) => response.body.items[index].index?.status === 201);
    const createdItemsCount = createdItems.length;

    const duplicateSignalsCount = countBy(response.body.items, 'create.status')['409'];
    const errorCountByMessage = errorAggregator(response.body, [409]);

    logger.debug(buildRuleMessage(`bulk created ${createdItemsCount} signals`));

    if (duplicateSignalsCount > 0) {
      logger.debug(buildRuleMessage(`ignored ${duplicateSignalsCount} duplicate signals`));
    }

    if (!isEmpty(errorCountByMessage)) {
      logger.error(
        buildRuleMessage(
          `[-] bulkResponse had errors with responses of: ${JSON.stringify(errorCountByMessage)}`
        )
      );

      return {
        errors: Object.keys(errorCountByMessage),
        success: false,
        bulkCreateDuration: makeFloatString(end - start),
        createdItemsCount: createdItems.length,
        createdItems,
      };
    } else {
      return {
        errors: [],
        success: true,
        bulkCreateDuration: makeFloatString(end - start),
        createdItemsCount: createdItems.length,
        createdItems,
      };
    }
  };
