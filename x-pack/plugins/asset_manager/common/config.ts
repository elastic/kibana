/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const INDEX_DEFAULTS = {
  logs: 'filebeat-*,logs-*',
};

export const configSchema = schema.object({
  alphaEnabled: schema.maybe(schema.boolean()),
  // Designate where various types of data live.
  // NOTE: this should be handled in a centralized way for observability, so
  // that when a user configures these differently from the known defaults,
  // that value is propagated everywhere. For now, we duplicate the value here.
  sourceIndices: schema.object(
    {
      logs: schema.string({ defaultValue: INDEX_DEFAULTS.logs }),
    },
    { defaultValue: INDEX_DEFAULTS }
  ),
});

export type AssetManagerConfig = TypeOf<typeof configSchema>;

/**
 * The following map is passed to the server plugin setup under the
 * exposeToBrowser: option, and controls which of the above config
 * keys are allow-listed to be available in the browser config.
 *
 * NOTE: anything exposed here will be visible in the UI dev tools,
 * and therefore MUST NOT be anything that is sensitive information!
 */
export const exposeToBrowserConfig = {
  alphaEnabled: true,
} as const;

type ValidKeys = keyof {
  [K in keyof typeof exposeToBrowserConfig as typeof exposeToBrowserConfig[K] extends true
    ? K
    : never]: true;
};

export type AssetManagerPublicConfig = Pick<AssetManagerConfig, ValidKeys>;
