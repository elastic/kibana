/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { KibanaRequest } from '@kbn/core-http-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { IEventLogClient } from '@kbn/event-log-plugin/server';
import { AuditLogger } from '@kbn/security-plugin/server';
import { RunNowResult } from '@kbn/task-manager-plugin/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { Logger } from '@kbn/core/server';
import { ActionsAuthorization } from '..';
import { ActionTypeRegistry } from '../action_type_registry';
import { ExecutionEnqueuer, BulkExecutionEnqueuer } from '../create_execute_function';
import { ActionExecutorContract } from '../lib';
import { InMemoryConnector, ConnectorTokenClientContract } from '../types';

export interface ActionsClientContext {
  readonly logger: Logger;
  readonly kibanaIndices: string[];
  readonly scopedClusterClient: IScopedClusterClient;
  readonly actionTypeRegistry: ActionTypeRegistry;
  readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  readonly inMemoryConnectors: InMemoryConnector[];
  readonly actionExecutor: ActionExecutorContract;
  readonly executionEnqueuer: ExecutionEnqueuer<void>;
  readonly ephemeralExecutionEnqueuer: ExecutionEnqueuer<RunNowResult>;
  readonly bulkExecutionEnqueuer: BulkExecutionEnqueuer<void>;
  readonly request: KibanaRequest;
  readonly authorization: ActionsAuthorization;
  readonly auditLogger?: AuditLogger;
  readonly usageCounter?: UsageCounter;
  readonly connectorTokenClient: ConnectorTokenClientContract;
  readonly getEventLogClient: () => Promise<IEventLogClient>;
}
