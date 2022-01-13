/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { ConnectorTypes } from '../../common/api';

export { CasesService } from './cases';
export { CaseConfigureService } from './configure';
export { CaseUserActionService } from './user_actions';
export { ConnectorMappingsService } from './connector_mappings';
export { AlertService } from './alerts';
export { AttachmentService } from './attachments';

export interface ClientArgs {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
}

export type ESConnectorFields = Array<{
  key: string;
  value: unknown;
}>;

export interface ESCaseConnector {
  name: string;
  type: ConnectorTypes;
  fields: ESConnectorFields | null;
}
