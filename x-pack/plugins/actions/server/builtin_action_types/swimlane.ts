/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry } from 'lodash';
import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import { postSwimlane } from './lib/post_swimlane';
import { Logger } from '../../../../../src/core/server';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';
import { ActionsConfigurationUtilities } from '../actions_config';

export type SwimlaneActionType = ActionType<
  ActionTypeConfigType,
  ActionTypeSecretsType,
  ActionParamsType,
  unknown
>;
export type SwimlaneActionTypeExecutorOptions = ActionTypeExecutorOptions<
  ActionTypeConfigType,
  ActionTypeSecretsType,
  ActionParamsType
>;

// config definition

export type ActionTypeConfigType = TypeOf<typeof ConfigSchema>;

const configSchemaProps = {
  apiUrl: schema.nullable(schema.string()),
  appId: schema.string(),
  username: schema.string(),
};
const ConfigSchema = schema.object(configSchemaProps);
// secrets definition

export type ActionTypeSecretsType = TypeOf<typeof SecretsSchema>;

const SecretsSchema = schema.object({
  apiToken: schema.string(),
});

// params definition

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

const PayloadSeveritySchema = schema.oneOf([
  schema.literal('critical'),
  schema.literal('error'),
  schema.literal('warning'),
  schema.literal('info'),
]);

const ParamsSchema = schema.object({
  alertName: schema.string(),
  severity: schema.maybe(PayloadSeveritySchema),
  tags: schema.nullable(schema.string()),
  comments: schema.nullable(schema.string()),
});

// action type definition
export function getActionType({
  logger,
  configurationUtilities,
}: {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}): SwimlaneActionType {
  return {
    id: '.swimlane',
    minimumLicenseRequired: 'gold',
    name: i18n.translate('xpack.actions.builtin.swimlaneTitle', {
      defaultMessage: 'Swimlane',
    }),
    validate: {
      config: schema.object(configSchemaProps, {
        validate: curry(valdiateActionTypeConfig)(configurationUtilities),
      }),
      secrets: SecretsSchema,
      params: ParamsSchema,
    },
    executor: curry(executor)({ logger }),
  };
}

function valdiateActionTypeConfig(
  configurationUtilities: ActionsConfigurationUtilities,
  configObject: ActionTypeConfigType
) {
  try {
    configurationUtilities.ensureUriAllowed(getSwimlaneApiUrl(configObject));
  } catch (allowListError) {
    return i18n.translate('xpack.actions.builtin.swimlane.swimlaneConfigurationError', {
      defaultMessage: 'error configuring swimlane action: {message}',
      values: {
        message: allowListError.message,
      },
    });
  }
}

function getSwimlaneApiUrl(config: ActionTypeConfigType): string {
  return config.apiUrl + '/app/' + config.appId + '/record';
}

// action executor

async function executor(
  { logger }: { logger: Logger },
  execOptions: SwimlaneActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult<unknown>> {
  const actionId = execOptions.actionId;
  const config = execOptions.config;
  const secrets = execOptions.secrets;
  const params = execOptions.params;
  const services = execOptions.services;
  const proxySettings = execOptions.proxySettings;

  const apiUrl = getSwimlaneApiUrl(config);
  const headers = {
    'Content-Type': 'application/json',
    'Private-Token': secrets.apiToken,
  };
  const data = getBodyForEventAction(actionId, config, params);

  let response;
  try {
    response = await postSwimlane({ apiUrl, data, headers, services, proxySettings }, logger);
  } catch (err) {
    const message = i18n.translate('xpack.actions.builtin.swimlane.postingErrorMessage', {
      defaultMessage: 'error posting swimlane event',
    });
    logger.warn(`error thrown posting swimlane event: ${err.message}`);
    return {
      status: 'error',
      actionId,
      message,
      serviceMessage: err.message,
    };
  }

  logger.debug(`response posting swimlane event: ${response.status}`);

  if (response.status === 202) {
    return {
      status: 'ok',
      actionId,
      data: response.data,
    };
  }

  if (response.status === 429 || response.status >= 500) {
    const message = i18n.translate('xpack.actions.builtin.swimlane.postingRetryErrorMessage', {
      defaultMessage: 'error posting swimlane event: http status {status}, retry later',
      values: {
        status: response.status,
      },
    });

    return {
      status: 'error',
      actionId,
      message,
      retry: true,
    };
  }

  const message = i18n.translate('xpack.actions.builtin.swimlane.postingUnexpectedErrorMessage', {
    defaultMessage: 'error posting swimlane event: unexpected status {status}',
    values: {
      status: response.status,
    },
  });

  return {
    status: 'error',
    actionId,
    message,
  };
}

// utilities

interface SwimlanePayload {
  $type: string;
  isNew: boolean;
  applicationId: string;
  comments?: {
    $type: string;
    comments?: string | null;
  };
  fieldValues?: {
    $type: string;
    alertName: string;
    severity: string;
    tags?: string | null;
  };
}

function getBodyForEventAction(
  actionId: string,
  config: ActionTypeConfigType,
  params: ActionParamsType
): SwimlanePayload {
  const data: SwimlanePayload = {
    $type: 'Core.Models.Record.Record, Core',
    isNew: true,
    applicationId: config.appId,
  };

  data.fieldValues = {
    $type:
      'System.Collections.Generic.Dictionary`2[[System.String, mscorlib],[System.Object, mscorlib]], mscorlib',
    alertName: params.alertName,
    severity: params.severity || 'info',
    tags: params.tags,
  };
  data.comments = {
    $type:
      'System.Collections.Generic.Dictionary`2[[System.String, mscorlib],[System.Collections.Generic.List`1[[Core.Models.Record.Comments, Core]], mscorlib]], mscorlib',
    comments: params.comments,
  };

  return data;
}
