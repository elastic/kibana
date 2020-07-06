/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry } from 'lodash';
import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';

import { Logger } from '../../../../../src/core/server';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';

// config definition

export type ActionTypeConfigType = TypeOf<typeof ConfigSchema>;

const ConfigSchema = schema.object({
  index: schema.string(),
  refresh: schema.boolean({ defaultValue: false }),
  executionTimeField: schema.nullable(schema.string()),
});

// params definition

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

// see: https://www.elastic.co/guide/en/elasticsearch/reference/current/actions-index.html
// - timeout not added here, as this seems to be a generic thing we want to do
//   eventually: https://github.com/elastic/kibana/projects/26#card-24087404
const ParamsSchema = schema.object({
  documents: schema.arrayOf(schema.recordOf(schema.string(), schema.any())),
});

// action type definition
export function getActionType({ logger }: { logger: Logger }): ActionType {
  return {
    id: '.index',
    minimumLicenseRequired: 'basic',
    name: i18n.translate('xpack.actions.builtin.esIndexTitle', {
      defaultMessage: 'Index',
    }),
    validate: {
      config: ConfigSchema,
      params: ParamsSchema,
    },
    executor: curry(executor)({ logger }),
  };
}

// action executor

async function executor(
  { logger }: { logger: Logger },
  execOptions: ActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult> {
  const actionId = execOptions.actionId;
  const config = execOptions.config as ActionTypeConfigType;
  const params = execOptions.params as ActionParamsType;
  const services = execOptions.services;

  const index = config.index;

  const bulkBody = [];
  for (const document of params.documents) {
    const timeField = config.executionTimeField == null ? '' : config.executionTimeField.trim();
    if (timeField !== '') {
      document[timeField] = new Date();
    }

    bulkBody.push({ index: {} });
    bulkBody.push(document);
  }

  const bulkParams = {
    index,
    body: bulkBody,
    refresh: config.refresh,
  };

  let result;
  try {
    result = await services.callCluster('bulk', bulkParams);
  } catch (err) {
    const message = i18n.translate('xpack.actions.builtin.esIndex.errorIndexingErrorMessage', {
      defaultMessage: 'error indexing documents',
    });
    logger.error(`error indexing documents: ${err.message}`);
    return {
      status: 'error',
      actionId,
      message,
      serviceMessage: err.message,
    };
  }

  return { status: 'ok', data: result, actionId };
}
