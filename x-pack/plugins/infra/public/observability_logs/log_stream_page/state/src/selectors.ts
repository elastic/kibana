/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate/react';
import { LogStreamQueryActorRef } from '../../../log_stream_query_state';
import { LogStreamPageActorRef } from './state_machine';

export const useLogStreamQueryChildService = (
  logStreamPageStateService: LogStreamPageActorRef
): LogStreamQueryActorRef =>
  useSelector(logStreamPageStateService, (state) => state.children.logStreamQuery);
