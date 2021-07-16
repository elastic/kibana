/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';

export { CasesService } from './cases';
export { CaseConfigureService } from './configure';
export { CaseUserActionService } from './user_actions';
export { ConnectorMappingsService } from './connector_mappings';
export { AlertService, AlertServiceContract } from './alerts';
export { AttachmentService } from './attachments';

export interface ClientArgs {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
}

/**
 * The name of the saved object reference indicating the action connector ID. This is stored in the Saved Object reference
 * field's name property.
 */
export const connectorIDReferenceName = 'connectorID';

/**
 * The name of the saved object reference indicating the action connector ID that was used to push a case.
 */
export const pushConnectorIDReferenceName = 'pushConnectorID';
