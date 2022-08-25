/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import type {
  CoreStart,
  ISavedObjectsRepository,
  IUiSettingsClient,
  Logger,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers, SavedObjectsType } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { apmExperimentalFeaturesSettings } from '@kbn/observability-plugin/common';
import { difference } from 'lodash';
import { APM_EXPERIMENTAL_FEATURES_TYPE } from '../../common/apm_saved_object_constants';

export interface ExperimentalFeatures {
  isAutoSubscribed: boolean;
  experimentalFeatures: string[];
}

export const apmExperimentalFeatures: SavedObjectsType = {
  name: APM_EXPERIMENTAL_FEATURES_TYPE,
  hidden: false,
  namespaceType: 'multiple',
  mappings: {
    properties: {
      isAutoSubscribed: { type: 'boolean' },
      experimentalFeatures: { type: 'text' },
    },
  },
  management: {
    importableAndExportable: false,
    icon: 'apmApp',
    getTitle: () =>
      i18n.translate('xpack.apm.apmServiceGroups.index', {
        defaultMessage: 'APM Experimental features - Index',
      }),
  },
};

async function fetchHandledApmExperiments(repository: ISavedObjectsRepository) {
  try {
    return await repository.find<Partial<ExperimentalFeatures>>({
      type: APM_EXPERIMENTAL_FEATURES_TYPE,
      page: 1,
      perPage: 10_000, // max number of spaces as of 8.2
      namespaces: ['*'],
    });
  } catch (err) {
    if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
      // This can happen if APM is not being used
      return null;
    }
    throw err;
  }
}

function updateSavedObject({
  savedObject,
  currentExperimentalFeaturesKey,
  repository,
}: {
  savedObject: SavedObjectsFindResult<Partial<ExperimentalFeatures>>;
  currentExperimentalFeaturesKey: string[];
  repository: ISavedObjectsRepository;
}) {
  try {
    repository.update<ExperimentalFeatures>(
      APM_EXPERIMENTAL_FEATURES_TYPE,
      savedObject.id,
      {
        isAutoSubscribed: savedObject.attributes.isAutoSubscribed,
        experimentalFeatures: currentExperimentalFeaturesKey,
      },
      { namespace: savedObject.namespaces?.[0] }
    );
  } catch (e) {
    // TODO: better handle this erro
    console.log('### caue ~ e', e);
  }
}

function enableExperimentalSettings({
  settingsKeysToEnable,
  uiSettingsClient,
}: {
  settingsKeysToEnable: string[];
  uiSettingsClient: IUiSettingsClient;
}) {
  // TODO: check which space
  return settingsKeysToEnable.map((key) => uiSettingsClient.set(key, true));
}

export async function autoSubscribeToNewExperimentalFeatures({
  coreStart,
  logger,
}: {
  coreStart: CoreStart;
  logger: Logger;
}) {
  const repository = coreStart.savedObjects.createInternalRepository();
  const uiSettingsClient = coreStart.uiSettings.asScopedToClient(repository);

  try {
    const result = await fetchHandledApmExperiments(repository);

    // If there's no saved object found don't go any further
    if (!result) {
      return;
    }

    const currentExperimentalFeaturesKey = Object.keys(
      apmExperimentalFeaturesSettings
    );

    const promises = result.saved_objects
      .filter(
        // Only auto subscribe to new features if flag is true
        (savedObject) => savedObject.attributes.isAutoSubscribed
      )
      .flatMap((savedObject) => {
        const oldFeaturesKeysToRemove = difference(
          savedObject.attributes.experimentalFeatures,
          currentExperimentalFeaturesKey
        );

        const newFeaturesKeysToAdd = difference(
          currentExperimentalFeaturesKey,
          savedObject.attributes.experimentalFeatures || []
        );

        // Enable all new features by setting it to true in the Advanced settings
        const enableExperimentalSettingsPromises = newFeaturesKeysToAdd.length
          ? enableExperimentalSettings({
              settingsKeysToEnable: newFeaturesKeysToAdd,
              uiSettingsClient,
            })
          : [];

        // Update saved object adding new features and removing old ones that is no longer exists
        const savedObjectPromise =
          oldFeaturesKeysToRemove.length || newFeaturesKeysToAdd.length
            ? updateSavedObject({
                repository,
                savedObject,
                currentExperimentalFeaturesKey,
              })
            : undefined;

        // returns both uiSettings promises and savedObject promise
        return [...enableExperimentalSettingsPromises, savedObjectPromise];
      });

    await Promise.all(promises);
  } catch (e) {
    logger.error(
      'Failed to auto subscribe to new experimental features: ' + e.message
    );
  }
}
