/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import { countBy, isEmpty, get } from 'lodash';

import { ElasticsearchClient, Logger } from 'kibana/server';
import { BuildRuleMessage } from './rule_messages';
import { RefreshTypes } from '../types';
import { BaseHit } from '../../../../common/detection_engine/types';
import { errorAggregator, makeFloatString } from './utils';
import { withSecuritySpan } from '../../../utils/with_security_span';

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
    esClient: ElasticsearchClient,
    buildRuleMessage: BuildRuleMessage,
    refreshForBulkCreate: RefreshTypes,
    indexNameOverride?: string
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

    const bulkBody = wrappedDocs.flatMap((wrappedDoc) => [
      {
        create: {
          _index: indexNameOverride ?? wrappedDoc._index,
          _id: wrappedDoc._id,
        },
      },
      wrappedDoc._source,
    ]);
    const start = performance.now();

    const response = await withSecuritySpan('writeAlertsBulk', () =>
      esClient.bulk({
        refresh: refreshForBulkCreate,
        body: bulkBody,
      })
    );

    const end = performance.now();
    logger.debug(
      buildRuleMessage(
        `individual bulk process time took: ${makeFloatString(end - start)} milliseconds`
      )
    );
    logger.debug(buildRuleMessage(`took property says bulk took: ${response.took} milliseconds`));
    const createdItems = wrappedDocs
      .map((doc, index) => ({
        _id: response.items[index].create?._id ?? '',
        _index: response.items[index].create?._index ?? '',
        ...doc._source,
      }))
      .filter((_, index) => get(response.items[index], 'create.status') === 201);
    const createdItemsCount = createdItems.length;
    const duplicateSignalsCount = countBy(response.items, 'create.status')['409'];
    const errorCountByMessage = errorAggregator(response, [409]);

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
        createdItemsCount,
        createdItems,
      };
    } else {
      return {
        errors: [],
        success: true,
        bulkCreateDuration: makeFloatString(end - start),
        createdItemsCount,
        createdItems,
      };
    }
  };
