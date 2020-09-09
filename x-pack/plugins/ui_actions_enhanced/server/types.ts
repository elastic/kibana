/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PersistableState,
  PersistableStateDefinition,
  SerializableState,
} from '../../../../src/plugins/kibana_utils/common';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SerializedAction<Config extends SerializableState = SerializableState> = {
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

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DynamicActionsState = {
  events: SerializedEvent[];
};

export type ActionFactoryRegistry = Map<string, ActionFactory>;

export interface ActionFactoryDefinition<P extends SerializedEvent = SerializedEvent>
  extends PersistableStateDefinition<P> {
  id: string;
}

export interface ActionFactory<P extends SerializedEvent = SerializedEvent>
  extends PersistableState<P> {
  id: string;
}
