/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TriggerId } from '../../../../../src/plugins/ui_actions/public';
import { SerializableState } from '../../../../../src/plugins/kibana_utils/common';

export type BaseActionConfig = SerializableState;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SerializedAction<Config extends BaseActionConfig = BaseActionConfig> = {
  readonly factoryId: string;
  readonly name: string;
  readonly config: Config;
};

/**
 * Serialized representation of a triggers-action pair, used to persist in storage.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SerializedEvent = {
  eventId: string;
  triggers: string[];
  action: SerializedAction;
};

/**
 * Action factory context passed into ActionFactories' CollectConfig, getDisplayName, getIconType
 */
export interface BaseActionFactoryContext<SupportedTriggers extends TriggerId = TriggerId> {
  triggers: SupportedTriggers[];
}
