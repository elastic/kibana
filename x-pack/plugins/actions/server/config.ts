/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { Logger } from '../../../../src/core/server';

export enum AllowedHosts {
  Any = '*',
}

export enum EnabledActionTypes {
  Any = '*',
}

const preconfiguredActionSchema = schema.object({
  name: schema.string({ minLength: 1 }),
  actionTypeId: schema.string({ minLength: 1 }),
  config: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  secrets: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
});

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  allowedHosts: schema.arrayOf(
    schema.oneOf([schema.string({ hostname: true }), schema.literal(AllowedHosts.Any)]),
    {
      defaultValue: [AllowedHosts.Any],
    }
  ),
  enabledActionTypes: schema.arrayOf(
    schema.oneOf([schema.string(), schema.literal(EnabledActionTypes.Any)]),
    {
      defaultValue: [AllowedHosts.Any],
    }
  ),
  preconfigured: schema.recordOf(schema.string(), preconfiguredActionSchema, {
    defaultValue: {},
    validate: validatePreconfigured,
  }),
  proxyUrl: schema.maybe(schema.string()),
  proxyHeaders: schema.maybe(schema.recordOf(schema.string(), schema.string())),
  proxyRejectUnauthorizedCertificates: schema.boolean({ defaultValue: true }),
  proxyBypassHosts: schema.maybe(schema.arrayOf(schema.string({ hostname: true }))),
  proxyOnlyHosts: schema.maybe(schema.arrayOf(schema.string({ hostname: true }))),
  rejectUnauthorized: schema.boolean({ defaultValue: true }),
  maxResponseContentLength: schema.byteSize({ defaultValue: '1mb' }),
  responseTimeout: schema.duration({ defaultValue: '60s' }),
});

export type ActionsConfig = TypeOf<typeof configSchema>;

// It would be nicer to add the proxyBypassHosts / proxyOnlyHosts restriction on
// simultaneous usage in the config validator directly, but there's no good way to express
// this relationship in the cloud config constraints, so we're doing it "live".
export function getValidatedConfig(logger: Logger, originalConfig: ActionsConfig): ActionsConfig {
  const proxyBypassHosts = originalConfig.proxyBypassHosts;
  const proxyOnlyHosts = originalConfig.proxyOnlyHosts;

  if (proxyBypassHosts && proxyOnlyHosts) {
    logger.warn(
      'The confgurations xpack.actions.proxyBypassHosts and xpack.actions.proxyOnlyHosts can not be used at the same time. The configuration xpack.actions.proxyOnlyHosts will be ignored.'
    );
    const tmp: Record<string, unknown> = originalConfig;
    delete tmp.proxyOnlyHosts;
    return tmp as ActionsConfig;
  }

  return originalConfig;
}

const invalidActionIds = new Set(['', '__proto__', 'constructor']);

function validatePreconfigured(preconfigured: Record<string, unknown>): string | undefined {
  // check for ids that should not be used
  for (const id of Object.keys(preconfigured)) {
    if (invalidActionIds.has(id)) {
      return `invalid preconfigured action id "${id}"`;
    }
  }

  // in case __proto__ was used as a preconfigured action id ...
  if (Object.getPrototypeOf(preconfigured) !== Object.getPrototypeOf({})) {
    return `invalid preconfigured action id "__proto__"`;
  }
}
