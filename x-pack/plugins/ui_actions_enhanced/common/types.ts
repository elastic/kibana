/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';

export type BaseActionConfig = SerializableRecord;

export type SerializedAction<Config extends BaseActionConfig = BaseActionConfig> = {
  readonly factoryId: string;
  readonly name: string;
  readonly config: Config;
};

/**
 * Serialized representation of a triggers-action pair, used to persist in storage.
 */
export type SerializedEvent = {
  eventId: string;
  triggers: string[];
  action: SerializedAction;
};

export type DynamicActionsState = {
  events: SerializedEvent[];
};
