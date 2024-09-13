/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { getConnectorSo } from '../../../../data/connector';
import { connectorSchema } from '../../schemas';
import { Connector } from '../../types';
import { ConnectorAuditAction, connectorAuditEvent } from '../../../../lib/audit_events';
import { isConnectorDeprecated } from '../../lib';
import { GetParams } from './types';

export async function get({
  context,
  id,
  throwIfSystemAction = true,
}: GetParams): Promise<Connector> {
  try {
    await context.authorization.ensureAuthorized({ operation: 'get' });
  } catch (error) {
    context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.GET,
        savedObject: { type: 'action', id },
        error,
      })
    );
    throw error;
  }

  const foundInMemoryConnector = context.inMemoryConnectors.find(
    (connector) => connector.id === id
  );

  /**
   * Getting system connector is not allowed
   * if throwIfSystemAction is set to true.
   * Default behavior is to throw
   */
  if (
    foundInMemoryConnector !== undefined &&
    foundInMemoryConnector.isSystemAction &&
    throwIfSystemAction
  ) {
    throw Boom.notFound(`Connector ${id} not found`);
  }

  let connector: Connector;

  if (foundInMemoryConnector !== undefined) {
    context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.GET,
        savedObject: { type: 'action', id },
      })
    );

    connector = {
      id,
      actionTypeId: foundInMemoryConnector.actionTypeId,
      name: foundInMemoryConnector.name,
      isPreconfigured: foundInMemoryConnector.isPreconfigured,
      isSystemAction: foundInMemoryConnector.isSystemAction,
      isDeprecated: isConnectorDeprecated(foundInMemoryConnector),
    };
  } else {
    const result = await getConnectorSo({
      unsecuredSavedObjectsClient: context.unsecuredSavedObjectsClient,
      id,
    });

    context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.GET,
        savedObject: { type: 'action', id },
      })
    );

    connector = {
      id,
      actionTypeId: result.attributes.actionTypeId,
      isMissingSecrets: result.attributes.isMissingSecrets,
      name: result.attributes.name,
      config: result.attributes.config,
      isPreconfigured: false,
      isSystemAction: false,
      isDeprecated: isConnectorDeprecated(result.attributes),
    };
  }

  // Try to validate the connector, but don't throw.
  try {
    connectorSchema.validate(connector);
  } catch (e) {
    context.logger.warn(`Error validating connector: ${connector.id}, ${e}`);
  }

  return connector;
}
