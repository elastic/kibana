/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEventLogService } from '../../../../event_log/server';
import {
  EVENT_ACTION_EXECUTE_COMPLETE,
  EVENT_ACTION_EXECUTE_START,
  PLUGIN_ID,
} from '../../../common/constants';

/**
 * @internal
 */
export function registerEventLogProviderActions(eventLog: IEventLogService) {
  eventLog.registerProviderActions(PLUGIN_ID, [
    EVENT_ACTION_EXECUTE_START,
    EVENT_ACTION_EXECUTE_COMPLETE,
  ]);
}
