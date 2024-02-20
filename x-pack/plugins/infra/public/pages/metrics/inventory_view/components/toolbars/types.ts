/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MatchedStateFromActor } from '../../../../../observability_logs/xstate_helpers';
import {
  InventoryPageCallbacks,
  InventoryPageStateMachine,
} from '../../../../../observability_infra/inventory_page/state';
import { InventoryCloudAccount } from '../../../../../../common/http_api/inventory_meta_api';

import { CreateDerivedIndexPattern } from '../../../../../containers/metrics_source';

type InitializedPageState = MatchedStateFromActor<InventoryPageStateMachine, 'initialized'>;

export interface ToolbarProps {
  createDerivedIndexPattern: CreateDerivedIndexPattern;
  accounts: InventoryCloudAccount[];
  regions: string[];
  inventoryPageCallbacks: InventoryPageCallbacks;
  inventoryPageState: InitializedPageState;
}
