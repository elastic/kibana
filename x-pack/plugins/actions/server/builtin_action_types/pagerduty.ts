/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry, isUndefined, pick, omitBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import { postPagerduty } from './lib/post_pagerduty';
import { Logger } from '../../../../../src/core/server';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';
import { ActionsConfigurationUtilities } from '../actions_config';

// uses the PagerDuty Events API v2
// https://v2.developer.pagerduty.com/docs/events-api-v2
const PAGER_DUTY_API_URL = 'https://events.pagerduty.com/v2/enqueue';

export type PagerDutyActionType = ActionType<
  ActionTypeConfigType,
  ActionTypeSecretsType,
  ActionParamsType,
  unknown
>;
export type PagerDutyActionTypeExecutorOptions = ActionTypeExecutorOptions<
  ActionTypeConfigType,
  ActionTypeSecretsType,
  ActionParamsType
>;

// config definition

export type ActionTypeConfigType = TypeOf<typeof ConfigSchema>;

const configSchemaProps = {
  apiUrl: schema.nullable(schema.string()),
};
const ConfigSchema = schema.object(configSchemaProps);
// secrets definition

export type ActionTypeSecretsType = TypeOf<typeof SecretsSchema>;

const SecretsSchema = schema.object({
  routingKey: schema.string(),
});

// params definition

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

const EVENT_ACTION_TRIGGER = 'trigger';
const EVENT_ACTION_RESOLVE = 'resolve';
const EVENT_ACTION_ACKNOWLEDGE = 'acknowledge';
const EVENT_ACTIONS_WITH_REQUIRED_DEDUPKEY = new Set([
  EVENT_ACTION_RESOLVE,
  EVENT_ACTION_ACKNOWLEDGE,
]);

const EventActionSchema = schema.oneOf([
  schema.literal(EVENT_ACTION_TRIGGER),
  schema.literal(EVENT_ACTION_RESOLVE),
  schema.literal(EVENT_ACTION_ACKNOWLEDGE),
]);

const PayloadSeveritySchema = schema.oneOf([
  schema.literal('critical'),
  schema.literal('error'),
  schema.literal('warning'),
  schema.literal('info'),
]);

const ParamsSchema = schema.object(
  {
    eventAction: schema.maybe(EventActionSchema),
    dedupKey: schema.maybe(schema.string({ maxLength: 255 })),
    summary: schema.maybe(schema.string({ maxLength: 1024 })),
    source: schema.maybe(schema.string()),
    severity: schema.maybe(PayloadSeveritySchema),
    timestamp: schema.maybe(schema.string()),
    component: schema.maybe(schema.string()),
    group: schema.maybe(schema.string()),
    class: schema.maybe(schema.string()),
  },
  { validate: validateParams }
);

function validateParams(paramsObject: unknown): string | void {
  const { timestamp, eventAction, dedupKey } = paramsObject as ActionParamsType;
  if (timestamp != null && timestamp.length > 0) {
    try {
      const date = Date.parse(timestamp);
      if (isNaN(date)) {
        return i18n.translate('xpack.actions.builtin.pagerduty.invalidTimestampErrorMessage', {
          defaultMessage: `error parsing timestamp "{timestamp}"`,
          values: {
            timestamp,
          },
        });
      }
    } catch (err) {
      return i18n.translate('xpack.actions.builtin.pagerduty.timestampParsingFailedErrorMessage', {
        defaultMessage: `error parsing timestamp "{timestamp}": {message}`,
        values: {
          timestamp,
          message: err.message,
        },
      });
    }
  }
  if (eventAction && EVENT_ACTIONS_WITH_REQUIRED_DEDUPKEY.has(eventAction) && !dedupKey) {
    return i18n.translate('xpack.actions.builtin.pagerduty.missingDedupkeyErrorMessage', {
      defaultMessage: `DedupKey is required when eventAction is "{eventAction}"`,
      values: {
        eventAction,
      },
    });
  }
}

// action type definition
export function getActionType({
  logger,
  configurationUtilities,
}: {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}): PagerDutyActionType {
  return {
    id: '.pagerduty',
    minimumLicenseRequired: 'gold',
    name: i18n.translate('xpack.actions.builtin.pagerdutyTitle', {
      defaultMessage: 'PagerDuty',
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
    configurationUtilities.ensureUriAllowed(getPagerDutyApiUrl(configObject));
  } catch (allowListError) {
    return i18n.translate('xpack.actions.builtin.pagerduty.pagerdutyConfigurationError', {
      defaultMessage: 'error configuring pagerduty action: {message}',
      values: {
        message: allowListError.message,
      },
    });
  }
}

function getPagerDutyApiUrl(config: ActionTypeConfigType): string {
  return config.apiUrl || PAGER_DUTY_API_URL;
}

// action executor

async function executor(
  { logger }: { logger: Logger },
  execOptions: PagerDutyActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult<unknown>> {
  const actionId = execOptions.actionId;
  const config = execOptions.config;
  const secrets = execOptions.secrets;
  const params = execOptions.params;
  const services = execOptions.services;
  const proxySettings = execOptions.proxySettings;

  const apiUrl = getPagerDutyApiUrl(config);
  const headers = {
    'Content-Type': 'application/json',
    'X-Routing-Key': secrets.routingKey,
  };
  const data = getBodyForEventAction(actionId, params);

  let response;
  try {
    response = await postPagerduty({ apiUrl, data, headers, services, proxySettings }, logger);
  } catch (err) {
    const message = i18n.translate('xpack.actions.builtin.pagerduty.postingErrorMessage', {
      defaultMessage: 'error posting pagerduty event',
    });
    logger.warn(`error thrown posting pagerduty event: ${err.message}`);
    return {
      status: 'error',
      actionId,
      message,
      serviceMessage: err.message,
    };
  }

  logger.debug(`response posting pagerduty event: ${response.status}`);

  if (response.status === 202) {
    return {
      status: 'ok',
      actionId,
      data: response.data,
    };
  }

  if (response.status === 429 || response.status >= 500) {
    const message = i18n.translate('xpack.actions.builtin.pagerduty.postingRetryErrorMessage', {
      defaultMessage: 'error posting pagerduty event: http status {status}, retry later',
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

  const message = i18n.translate('xpack.actions.builtin.pagerduty.postingUnexpectedErrorMessage', {
    defaultMessage: 'error posting pagerduty event: unexpected status {status}',
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

const AcknowledgeOrResolve = new Set([EVENT_ACTION_ACKNOWLEDGE, EVENT_ACTION_RESOLVE]);

interface PagerDutyPayload {
  event_action: ActionParamsType['eventAction'];
  dedup_key?: string;
  payload?: {
    summary: string;
    source: string;
    severity: string;
    timestamp?: string;
    component?: string;
    group?: string;
    class?: string;
  };
}

function getBodyForEventAction(actionId: string, params: ActionParamsType): PagerDutyPayload {
  const eventAction = params.eventAction ?? EVENT_ACTION_TRIGGER;

  const data: PagerDutyPayload = {
    event_action: eventAction,
  };
  if (params.dedupKey) {
    data.dedup_key = params.dedupKey;
  }

  // for acknowledge / resolve, just send the dedup key
  if (AcknowledgeOrResolve.has(eventAction)) {
    return data;
  }

  data.payload = {
    summary: params.summary || 'No summary provided.',
    source: params.source || `Kibana Action ${actionId}`,
    severity: params.severity || 'info',
    ...omitBy(pick(params, ['timestamp', 'component', 'group', 'class']), isUndefined),
  };

  return data;
}
