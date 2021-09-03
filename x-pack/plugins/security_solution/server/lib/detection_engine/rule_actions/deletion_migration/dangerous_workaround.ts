/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient, Logger } from '../../../../../../../../src/core/server';
import { deleteSideCarAction } from './delete_side_car_action';
import { resolveAlertSavedObject } from './resolve_alert_saved_object';
import { SideCarAction } from './/types';
import { updateAlertingSavedObject } from './update_alerting_saved_object';
import { ruleActionsSavedObjectType } from '../saved_object_mappings';

/**
 * Wrapper to where we do a try/catch to reduce changes of this causing user systems from starting due to changing code or saved object
 * shapes or anything else for as long as we have this dangerous migration code around.
 * @param savedObjectsClient The saved objects client
 * @param logger The logger to log messages
 * @deprecated Remove this once we are upgraded or we have better migrations and this code is safely moved to that area.
 */
export const dangerousWorkaroundToMigrateActionsSideCarSavedObjects = async ({
  logger,
  savedObjectsClient,
}: {
  logger: Logger;
  savedObjectsClient: SavedObjectsClient;
}): Promise<void> => {
  try {
    await workAroundToMigrateActionsSideCarSavedObjects({ logger, savedObjectsClient });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '(unknown)';
    logger.error(
      `Unexpected error while attempting to delete a migration. Error message: ${errorMessage}`
    );
  }
};

/**
 * Dangerous workaround for alerting saved object migrations where we migrate actions side car models directly to the actions
 * array on alerts. The current
 *
 * TODO: When/If support for doing joins with migrations is solved:
 * (https://github.com/elastic/kibana/issues/109188)
 *
 * Then move this code over to ensure migrations. However, if we are sure that all customers have since 7.16+ at least started
 * Kibana once for this migration to run, then this code can also be removed.
 *
 * If this code does not run or a user is not migrated, the worst case is that rules/alerts which had an interval of
 * "hour/daily/weekly" will end up showing as having "no actions" for their alerting/rule and will need a user to manually
 * click the alert/rule "no actions" to change it to "hour/daily/weekly"
 *
 * This is labeled "dangerous" because this exists outside of the normal SavedObject migration process and always has to run
 * on startup which slows down startup and has to be maintained for a prolonged period of time. This pattern should BE AVOIDED,
 * and normal migration hooks should be used.
 *
 * NOTE: savedObjectClient.resolve() is used since we don't know how far in the future the migrations are going to run for this
 * dangerous migration function. The ID could have been re-generated and this is the safest to hope we can migrate farther in the future.
 * @param savedObjectsClient The saved objects client
 * @param logger The logger to log messages
 * @deprecated Remove this once we are upgraded or we have better migrations and this code is safely moved to that area.
 */
const workAroundToMigrateActionsSideCarSavedObjects = async ({
  logger,
  savedObjectsClient,
}: {
  logger: Logger;
  savedObjectsClient: SavedObjectsClient;
}): Promise<void> => {
  const sideCarActionFinder = savedObjectsClient.createPointInTimeFinder<SideCarAction>({
    perPage: 100,
    type: ruleActionsSavedObjectType,
  });

  for await (const sideCarActionResponse of sideCarActionFinder.find()) {
    const { saved_objects: sideCarActions } = sideCarActionResponse;

    logger.info(
      `Starting a batch of migrating saved objects ${ruleActionsSavedObjectType} of length ${sideCarActions.length}`
    );
    for (const sideCarAction of sideCarActions) {
      const { ruleAlertId, actions } = sideCarAction.attributes;

      logger.info(
        `Migrating actions of length: ${actions.length} on saved_object id: ${sideCarAction.id}`
      );

      const alert = await resolveAlertSavedObject({ savedObjectsClient, ruleAlertId, logger });
      if (alert != null) {
        await updateAlertingSavedObject({
          logger,
          alert,
          actions: sideCarAction.attributes.actions,
          savedObjectsClient,
        });
        await deleteSideCarAction({
          logger,
          id: sideCarAction.id,
          savedObjectsClient,
        });
      }
    }
  }
  sideCarActionFinder.close();
};
