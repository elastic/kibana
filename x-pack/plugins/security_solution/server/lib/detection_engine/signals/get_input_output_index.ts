/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { DataViewAttributes } from '@kbn/data-views-plugin/common';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Logger } from '@kbn/core/server';

import { DEFAULT_INDEX_KEY, DEFAULT_INDEX_PATTERN } from '../../../../common/constants';
import { withSecuritySpan } from '../../../utils/with_security_span';

export interface GetInputIndex {
  index: string[] | null | undefined;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  version: string;
  logger: Logger;
  // the rule's rule_id
  ruleId: string;
  dataViewId?: string;
}

export interface GetInputIndexReturn {
  index: string[] | null;
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  errorToWrite?: string;
  warningToWrite?: string;
}

export class DataViewError extends Error {}

export const getInputIndex = async ({
  index,
  services,
  version,
  logger,
  ruleId,
  dataViewId,
}: GetInputIndex): Promise<GetInputIndexReturn> => {
  // If data views defined, use it
  if (dataViewId != null && dataViewId !== '') {
    // Check to see that the selected dataView exists
    let dataView;
    try {
      dataView = await services.savedObjectsClient.get<DataViewAttributes>(
        'index-pattern',
        dataViewId
      );
    } catch (exc) {
      throw new DataViewError(exc.message);
    }
    const indices = dataView.attributes.title.split(',');
    const runtimeMappings =
      dataView.attributes.runtimeFieldMap != null
        ? JSON.parse(dataView.attributes.runtimeFieldMap)
        : {};

    logger.debug(
      `[rule_id:${ruleId}] - Data view "${dataViewId}" found - indices to search include: ${indices}.`
    );
    logger.debug(
      `[rule_id:${ruleId}] - Data view "${dataViewId}" includes ${
        Object.keys(runtimeMappings).length
      } mapped runtime fields.`
    );

    // if data view does exist, return it and it's runtimeMappings
    return {
      index: indices,
      runtimeMappings,
    };
  }
  if (index != null) {
    logger.debug(`[rule_id:${ruleId}] - Indices to search include: ${index}.`);

    return {
      index,
      runtimeMappings: {},
    };
  } else {
    const configuration = await withSecuritySpan('getDefaultIndex', () =>
      services.savedObjectsClient.get<{
        'securitySolution:defaultIndex': string[];
      }>('config', version)
    );
    if (configuration.attributes != null && configuration.attributes[DEFAULT_INDEX_KEY] != null) {
      logger.debug(
        `[rule_id:${ruleId}] - No index patterns defined, falling back to using configured default indices: ${configuration.attributes[DEFAULT_INDEX_KEY]}.`
      );

      return {
        index: configuration.attributes[DEFAULT_INDEX_KEY],
        runtimeMappings: {},
      };
    } else {
      logger.debug(
        `[rule_id:${ruleId}] - No index patterns defined, falling back to using default indices: ${DEFAULT_INDEX_PATTERN}.`
      );

      return {
        index: DEFAULT_INDEX_PATTERN,
        runtimeMappings: {},
      };
    }
  }
};
