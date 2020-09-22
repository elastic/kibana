/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TriggerId } from '../../../../../src/plugins/ui_actions/public';
import { SerializedAction, SerializedEvent, BaseActionConfig } from '../../common/types';

export { SerializedAction, SerializedEvent, BaseActionConfig };

/**
 * Action factory context passed into ActionFactories' CollectConfig, getDisplayName, getIconType
 */
export interface BaseActionFactoryContext<SupportedTriggers extends TriggerId = TriggerId> {
  triggers: SupportedTriggers[];
}
