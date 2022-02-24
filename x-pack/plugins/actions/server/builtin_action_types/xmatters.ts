/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { curry, isString } from 'lodash';
import { schema, TypeOf } from '@kbn/config-schema';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';
import { ActionsConfigurationUtilities } from '../actions_config';
import { Logger } from '../../../../../src/core/server';
import { postXmatters } from './lib/post_xmatters';

export type XmattersActionType = ActionType<
  ActionTypeConfigType,
  ActionTypeSecretsType,
  ActionParamsType,
  unknown
>;
export type XmattersActionTypeExecutorOptions = ActionTypeExecutorOptions<
  ActionTypeConfigType,
  ActionTypeSecretsType,
  ActionParamsType
>;

const configSchemaProps = {
  configUrl: schema.maybe(schema.string()),
  usesBasic: schema.boolean({ defaultValue: true }),
};
const ConfigSchema = schema.object(configSchemaProps);
export type ActionTypeConfigType = TypeOf<typeof ConfigSchema>;

// secrets definition
export type ActionTypeSecretsType = TypeOf<typeof SecretsSchema>;
const secretSchemaProps = {
  user: schema.nullable(schema.string()),
  password: schema.nullable(schema.string()),
  secretsUrl: schema.maybe(schema.string()),
};
const SecretsSchema = schema.object(secretSchemaProps, {
  validate: (secrets) => {
    // user and password must be set together (or not at all)
    // if user/password provided, then no secretsUrl should be present
    if ((!secrets.password && secrets.user) || (secrets.password && !secrets.user)) {
      return i18n.translate('xpack.actions.builtin.xmatters.invalidUsernamePassword', {
        defaultMessage: 'Both user and password must be specified',
      });
    }
    if (secrets.password && secrets.user && !secrets.secretsUrl) return;
    if (!secrets.password && !secrets.user && secrets.secretsUrl) return;
    return i18n.translate('xpack.actions.builtin.xmatters.invalidSecrets', {
      defaultMessage: 'Either user and password or URL authentication must be specified',
    });
  },
});

// params definition
export type ActionParamsType = TypeOf<typeof ParamsSchema>;
const ParamsSchema = schema.object({
  alertActionGroupName: schema.maybe(schema.string()),
  signalId: schema.maybe(schema.string()),
  ruleName: schema.maybe(schema.string()),
  date: schema.maybe(schema.string()),
  severity: schema.string(),
  spaceId: schema.maybe(schema.string()),
  tags: schema.maybe(schema.string()),
});

export const ActionTypeId = '.xmatters';
// action type definition
export function getActionType({
  logger,
  configurationUtilities,
}: {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}): XmattersActionType {
  return {
    id: ActionTypeId,
    minimumLicenseRequired: 'gold',
    name: i18n.translate('xpack.actions.builtin.xmattersTitle', {
      defaultMessage: 'xMatters',
    }),
    validate: {
      config: schema.object(configSchemaProps, {
        validate: curry(validateActionTypeConfig)(configurationUtilities),
      }),
      secrets: schema.object(secretSchemaProps, {
        validate: curry(validateActionTypeSecrets)(configurationUtilities),
      }),
      params: ParamsSchema,
      connector: validateConnector,
    },
    executor: curry(executor)({ logger, configurationUtilities }),
  };
}

function validateActionTypeConfig(
  configurationUtilities: ActionsConfigurationUtilities,
  configObject: ActionTypeConfigType
): string | undefined {
  const configuredUrl = configObject.configUrl;
  const usesBasic = configObject.usesBasic;
  if (!usesBasic) return;
  try {
    if (configuredUrl) {
      new URL(configuredUrl);
    }
  } catch (err) {
    return i18n.translate('xpack.actions.builtin.xmatters.xmattersConfigurationErrorNoHostname', {
      defaultMessage: 'Error configuring xMatters action: unable to parse url: {err}',
      values: {
        err,
      },
    });
  }

  try {
    if (configuredUrl) {
      configurationUtilities.ensureUriAllowed(configuredUrl);
    }
  } catch (allowListError) {
    return i18n.translate('xpack.actions.builtin.xmatters.xmattersConfigurationError', {
      defaultMessage: 'Error configuring xMatters action: {message}',
      values: {
        message: allowListError.message,
      },
    });
  }
}

function validateConnector(
  config: ActionTypeConfigType,
  secrets: ActionTypeSecretsType
): string | null {
  const { user, password, secretsUrl } = secrets;
  const { usesBasic, configUrl } = config;

  if (usesBasic) {
    if (user === null) {
      return i18n.translate('xpack.actions.builtin.xmatters.missingUser', {
        defaultMessage: 'Username must be provided',
      });
    }
    if (password === null) {
      return i18n.translate('xpack.actions.builtin.xmatters.missingPassword', {
        defaultMessage: 'Password must be provided',
      });
    }
    if (configUrl === null) {
      return i18n.translate('xpack.actions.builtin.xmatters.missingConfigUrl', {
        defaultMessage: 'Url must be provided',
      });
    }
  } else {
    if (secretsUrl === null) {
      return i18n.translate('xpack.actions.builtin.xmatters.missingSecretsUrl', {
        defaultMessage: 'Url with API Key must be provided',
      });
    }
  }
  return null;
}

function validateActionTypeSecrets(
  configurationUtilities: ActionsConfigurationUtilities,
  secretsObject: ActionTypeSecretsType
): string | undefined {
  const secretsUrl = secretsObject.secretsUrl;
  try {
    if (secretsUrl) {
      new URL(secretsUrl);
    }
  } catch (err) {
    return i18n.translate('xpack.actions.builtin.xmatters.xmattersConfigurationErrorNoHostname', {
      defaultMessage: 'Error configuring xMatters action: unable to parse url: {err}',
      values: {
        err,
      },
    });
  }

  try {
    if (secretsUrl) {
      configurationUtilities.ensureUriAllowed(secretsUrl);
    }
  } catch (allowListError) {
    return i18n.translate('xpack.actions.builtin.xmatters.xmattersConfigurationError', {
      defaultMessage: 'Error configuring xMatters action: {message}',
      values: {
        message: allowListError.message,
      },
    });
  }
}

// action executor
export async function executor(
  {
    logger,
    configurationUtilities,
  }: { logger: Logger; configurationUtilities: ActionsConfigurationUtilities },
  execOptions: XmattersActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult<unknown>> {
  const actionId = execOptions.actionId;
  const { configUrl, usesBasic } = execOptions.config;
  const data = getPayloadForRequest(execOptions.params);

  const secrets: ActionTypeSecretsType = execOptions.secrets;
  const basicAuth =
    usesBasic && isString(secrets.user) && isString(secrets.password)
      ? { auth: { username: secrets.user, password: secrets.password } }
      : undefined;
  const url = usesBasic ? configUrl : secrets.secretsUrl;

  let result;
  try {
    if (!url) {
      throw new Error('Error: no url provided');
    }
    result = await postXmatters({ url, data, basicAuth }, logger, configurationUtilities);
  } catch (err) {
    const message = i18n.translate('xpack.actions.builtin.xmatters.postingErrorMessage', {
      defaultMessage: 'Error triggering xMatters workflow',
    });
    logger.warn(`Error thrown triggering xMatters workflow: ${err.message}`);
    return {
      status: 'error',
      actionId,
      message,
      serviceMessage: err.message,
    };
  }

  if (result.status >= 200 && result.status < 300) {
    const { status, statusText } = result;
    logger.debug(`response from xMatters action "${actionId}": [HTTP ${status}] ${statusText}`);

    return successResult(actionId, data);
  }

  const message = i18n.translate('xpack.actions.builtin.xmatters.postingRetryErrorMessage', {
    defaultMessage: 'Error triggering xMatters flow: http status {status}, retry later',
    values: {
      status: result.status,
    },
  });

  return {
    status: 'error',
    actionId,
    message,
    retry: true,
  };
}

// Action Executor Result w/ internationalisation
function successResult(actionId: string, data: unknown): ActionTypeExecutorResult<unknown> {
  return { status: 'ok', data, actionId };
}

interface XmattersPayload {
  alertActionGroupName?: string;
  signalId?: string;
  ruleName?: string;
  date?: string;
  severity: string;
  spaceId?: string;
  tags?: string;
}

function getPayloadForRequest(params: ActionParamsType): XmattersPayload {
  // xMatters will assume the request is a test when the signalId adn alertActionGroupName are not defined
  const data: XmattersPayload = {
    alertActionGroupName: params.alertActionGroupName,
    signalId: params.signalId,
    ruleName: params.ruleName,
    date: params.date,
    severity: params.severity || 'High',
    spaceId: params.spaceId,
    tags: params.tags,
  };

  return data;
}
