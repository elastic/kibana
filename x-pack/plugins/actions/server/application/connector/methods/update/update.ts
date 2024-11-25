/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { SavedObjectAttributes } from '@kbn/core/server';
import { isUndefined, omitBy } from 'lodash';
import { Connector } from '../../types';
import { ConnectorUpdateParams } from './types';
import { PreconfiguredActionDisabledModificationError } from '../../../../lib/errors/preconfigured_action_disabled_modification';
import { ConnectorAuditAction, connectorAuditEvent } from '../../../../lib/audit_events';
import { validateConfig, validateConnector, validateSecrets } from '../../../../lib';
import { isConnectorDeprecated } from '../../lib';
import { RawAction, HookServices } from '../../../../types';
import { tryCatch } from '../../../../lib';

export async function update({ context, id, action }: ConnectorUpdateParams): Promise<Connector> {
  try {
    await context.authorization.ensureAuthorized({ operation: 'update' });

    const foundInMemoryConnector = context.inMemoryConnectors.find(
      (connector) => connector.id === id
    );

    if (foundInMemoryConnector?.isSystemAction) {
      throw Boom.badRequest(
        i18n.translate('xpack.actions.serverSideErrors.systemActionUpdateForbidden', {
          defaultMessage: 'System action {id} can not be updated.',
          values: {
            id,
          },
        })
      );
    }

    if (foundInMemoryConnector?.isPreconfigured) {
      throw new PreconfiguredActionDisabledModificationError(
        i18n.translate('xpack.actions.serverSideErrors.predefinedActionUpdateDisabled', {
          defaultMessage: 'Preconfigured action {id} can not be updated.',
          values: {
            id,
          },
        }),
        'update'
      );
    }
  } catch (error) {
    context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.UPDATE,
        savedObject: { type: 'action', id },
        error,
      })
    );
    throw error;
  }
  const { attributes, references, version } =
    await context.unsecuredSavedObjectsClient.get<RawAction>('action', id);
  const { actionTypeId } = attributes;
  const { name, config, secrets } = action;
  const actionType = context.actionTypeRegistry.get(actionTypeId);
  const configurationUtilities = context.actionTypeRegistry.getUtils();
  const validatedActionTypeConfig = validateConfig(actionType, config, {
    configurationUtilities,
  });
  const validatedActionTypeSecrets = validateSecrets(actionType, secrets, {
    configurationUtilities,
  });
  if (actionType.validate?.connector) {
    validateConnector(actionType, { config, secrets });
  }

  context.actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);

  const hookServices: HookServices = {
    scopedClusterClient: context.scopedClusterClient,
  };

  if (actionType.preSaveHook) {
    try {
      await actionType.preSaveHook({
        connectorId: id,
        config,
        secrets,
        logger: context.logger,
        request: context.request,
        services: hookServices,
        isUpdate: true,
      });
    } catch (error) {
      context.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.UPDATE,
          savedObject: { type: 'action', id },
          error,
        })
      );
      throw error;
    }
  }

  context.auditLogger?.log(
    connectorAuditEvent({
      action: ConnectorAuditAction.UPDATE,
      savedObject: { type: 'action', id },
      outcome: 'unknown',
    })
  );

  const result = await tryCatch(
    async () =>
      await context.unsecuredSavedObjectsClient.create<RawAction>(
        'action',
        {
          ...attributes,
          actionTypeId,
          name,
          isMissingSecrets: false,
          config: validatedActionTypeConfig as SavedObjectAttributes,
          secrets: validatedActionTypeSecrets as SavedObjectAttributes,
        },
        omitBy(
          {
            id,
            overwrite: true,
            references,
            version,
          },
          isUndefined
        )
      )
  );

  const wasSuccessful = !(result instanceof Error);
  const label = `connectorId: "${id}"; type: ${actionTypeId}`;
  const tags = ['post-save-hook', id];

  if (actionType.postSaveHook) {
    try {
      await actionType.postSaveHook({
        connectorId: id,
        config,
        secrets,
        logger: context.logger,
        request: context.request,
        services: hookServices,
        isUpdate: true,
        wasSuccessful,
      });
    } catch (err) {
      context.logger.error(`postSaveHook update error for ${label}: ${err.message}`, {
        tags,
      });
    }
  }

  if (!wasSuccessful) {
    throw result;
  }

  try {
    await context.connectorTokenClient.deleteConnectorTokens({ connectorId: id });
  } catch (e) {
    context.logger.error(
      `Failed to delete auth tokens for connector "${id}" after update: ${e.message}`
    );
  }

  return {
    id,
    actionTypeId: result.attributes.actionTypeId as string,
    isMissingSecrets: result.attributes.isMissingSecrets as boolean,
    name: result.attributes.name as string,
    config: result.attributes.config as Record<string, unknown>,
    isPreconfigured: false,
    isSystemAction: false,
    isDeprecated: isConnectorDeprecated(result.attributes),
  };
}
