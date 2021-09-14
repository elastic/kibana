/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UpdateObjectsOptions } from '../../../startup_migrations/types';

import { SavedObject, SavedObjectsBulkUpdateObject } from '../../../../../../../../src/core/server';
import { Alerting, SideCarAction } from '../deletion_migration/types';
import { apiKeyAsAlertAttributes } from './api_key_as_alert_attributes';
import { getActionsCountInReferences } from '../deletion_migration/get_actions_count_in_references';
import { transformActions } from '../deletion_migration/transform_actions';
import { getThrottle } from './get_throttle';

export const updateObjects = async ({
  savedObject: actionSideCar,
  joins,
  encryptedSavedObjectsClient,
  logger,
}: UpdateObjectsOptions<SideCarAction>): Promise<Array<SavedObjectsBulkUpdateObject<Alerting>>> => {
  logger.debug(
    `Attempting to update alerting objects to remove the legacy action of type, siem-detection-engine-rule-actions and id of "${actionSideCar.id}"`
  );

  if (encryptedSavedObjectsClient == null) {
    logger.error(
      [
        'The "encryptedSavedObjects" plugin was not found within the security_solution application.',
        'Could not update legacy actions to newer actions because this plugin is not found',
        'Please check the existing "security_solution" actions to ensure their action intervals are set correctly as migrations have failed',
      ].join(' ')
    );
    return [];
  }

  const [resolvedAlert, ...resolvedActions] = joins as [
    SavedObject<Alerting>,
    ...Array<SavedObject<unknown>>
  ];

  logger.debug(`Updating alert id: "${resolvedAlert.id}" to remove legacy actions`);

  const keyAttributes = await apiKeyAsAlertAttributes({
    logger,
    id: resolvedAlert.id,
    encryptedSavedObjectsClient,
  });

  if (keyAttributes == null) {
    logger.error(
      [
        'Key attributes were found to be "null" or "undefined", returning without updating.',
        'Please check the existing "security_solution" actions to ensure their action intervals are set correctly as migrations have failed',
      ].join(' ')
    );
    return [];
  }

  if (actionSideCar.attributes.actions.length !== resolvedActions.length) {
    logger.error(
      [
        'Was expecting to have the same resolved actions as legacy actions but instead we have',
        `legacy actions length of: ${actionSideCar.attributes.actions.length} and`,
        `resolved actions length of: ${resolvedActions.length}.`,
        'Not updating this legacy action.',
        'Please check the existing "security_solution" actions to ensure their action intervals are set correctly as migrations have failed',
      ].join(' ')
    );
    return [];
  }

  // replace any id's that are different from the resolved id's
  const legacyActionsWithUpdatedId = actionSideCar.attributes.actions.map((action, index) => {
    const resolvedAction = resolvedActions[index];
    return {
      ...action,
      id: resolvedAction.id,
    };
  });

  // Remove duplicate references that already exist in both the "alert" and the "legacy action".
  const filteredAlertReferences = resolvedAlert.references.filter((reference) => {
    return !legacyActionsWithUpdatedId.some((action) => {
      return action.id === reference.id;
    });
  });

  // Remove duplicate legacy actions that already exist in both the "alert" and the "legacy action".
  const filteredLegacyActions = legacyActionsWithUpdatedId.filter((action) => {
    return !resolvedAlert.references.some((reference) => {
      return action.id === reference.id;
    });
  });

  const actionsCountInReferences = getActionsCountInReferences(filteredAlertReferences);
  const transformedActions = transformActions({
    actions: filteredLegacyActions,
    actionsCountInReferences,
  });
  logger.debug(
    `Actions appending to alert id: "${resolvedAlert.id}" ${JSON.stringify(transformedActions)}`
  );

  const transformedReferences = filteredLegacyActions.map((resolvedAction, index) => ({
    id: resolvedAction.id,
    name: `action_${index + actionsCountInReferences}`,
    type: 'action',
  }));
  logger.debug(
    `References appending to alert id: "${resolvedAlert.id}" ${JSON.stringify(transformedActions)}`
  );

  const update: SavedObjectsBulkUpdateObject<Alerting> = {
    type: 'alert',
    id: resolvedAlert.id,
    attributes: {
      ...resolvedAlert.attributes,
      actions: [...resolvedAlert.attributes.actions, ...transformedActions],
      apiKey: keyAttributes.apiKey,
      notifyWhen: 'onThrottleInterval',
      throttle: getThrottle({ logger, actionSideCar }),
      muteAll: false,
    },
    references: [...resolvedAlert.references, ...transformedReferences],
  };
  return [update];
};
