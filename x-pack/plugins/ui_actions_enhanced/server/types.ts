/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PersistableState, PersistableStateDefinition } from '@kbn/kibana-utils-plugin/common';

import { SerializedAction, SerializedEvent, DynamicActionsState } from '../common/types';

export type ActionFactoryRegistry = Map<string, ActionFactory>;

export interface ActionFactoryDefinition<P extends SerializedEvent = SerializedEvent>
  extends PersistableStateDefinition<P> {
  id: string;
}

export interface ActionFactory<P extends SerializedEvent = SerializedEvent>
  extends PersistableState<P> {
  id: string;
}

export type { SerializedEvent, SerializedAction, DynamicActionsState };
