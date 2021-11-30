/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializedAction, SerializedEvent, BaseActionConfig } from '../../common/types';

export type { SerializedAction, SerializedEvent, BaseActionConfig };

/**
 * Action factory context passed into ActionFactories' CollectConfig, getDisplayName, getIconType
 */
export interface BaseActionFactoryContext {
  triggers: string[];
}
