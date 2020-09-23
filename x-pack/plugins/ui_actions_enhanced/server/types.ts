/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PersistableState,
  PersistableStateDefinition,
} from '../../../../src/plugins/kibana_utils/common';

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

export { SerializedEvent, SerializedAction, DynamicActionsState };
