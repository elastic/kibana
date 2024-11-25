/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CoreSetup, IRouter } from '@kbn/core/server';
import type { InferenceServerStart, InferenceStartDependencies } from '../types';
import { registerChatCompleteRoute } from './chat_complete';
import { registerConnectorsRoute } from './connectors';

export const registerRoutes = ({
  router,
  logger,
  coreSetup,
}: {
  router: IRouter;
  logger: Logger;
  coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
}) => {
  registerChatCompleteRoute({ router, coreSetup, logger: logger.get('chatComplete') });
  registerConnectorsRoute({ router, coreSetup });
};
