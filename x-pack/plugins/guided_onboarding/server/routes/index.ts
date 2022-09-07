/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, SavedObjectsClient } from '@kbn/core/server';
import {
  guidedSetupDefaultState,
  guidedSetupSavedObjectsId,
  guidedSetupSavedObjectsType,
} from '../saved_objects';

const doesGuidedSetupExist = async (savedObjectsClient: SavedObjectsClient): Promise<boolean> => {
  return savedObjectsClient
    .find({ type: guidedSetupSavedObjectsType })
    .then((foundSavedObjects) => foundSavedObjects.total > 0);
};

export function defineRoutes(router: IRouter) {
  router.get(
    {
      path: '/api/guided_onboarding/state',
      validate: false,
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const soClient = coreContext.savedObjects.client as SavedObjectsClient;

      const stateExists = await doesGuidedSetupExist(soClient);
      if (stateExists) {
        const guidedSetupSO = await soClient.get(
          guidedSetupSavedObjectsType,
          guidedSetupSavedObjectsId
        );
        return response.ok({
          body: { state: guidedSetupSO.attributes },
        });
      }
      return response.ok({
        body: { state: guidedSetupDefaultState },
      });
    }
  );

  router.put(
    {
      path: '/api/guided_onboarding/state',
      validate: {
        body: schema.object({
          active_guide: schema.maybe(schema.string()),
          active_step: schema.maybe(schema.number()),
        }),
      },
    },
    async (context, request, response) => {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const active_guide = request.body.active_guide;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const active_step = request.body.active_step;
      const attributes = {
        ...guidedSetupDefaultState,
        active_guide,
        active_step,
      };
      const coreContext = await context.core;
      const soClient = coreContext.savedObjects.client as SavedObjectsClient;

      const stateExists = await doesGuidedSetupExist(soClient);

      if (stateExists) {
        const updatedGuidedSetupSO = await soClient.update(
          guidedSetupSavedObjectsType,
          guidedSetupSavedObjectsId,
          attributes
        );
        return response.ok({
          body: { state: updatedGuidedSetupSO.attributes },
        });
      }

      const guidedSetupSO = await soClient.create(guidedSetupSavedObjectsType, attributes, {
        id: guidedSetupSavedObjectsId,
      });

      return response.ok({
        body: {
          state: guidedSetupSO.attributes,
        },
      });
    }
  );
}
