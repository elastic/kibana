/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ElasticsearchClient,
  ISavedObjectsRepository,
  SavedObject,
  type KibanaRequest,
  type Logger,
} from '@kbn/core/server';
import { DataViewAttributes } from '@kbn/data-views-plugin/common';
import { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';

import {
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
  CDR_MISCONFIGURATIONS_DATA_VIEW_NAME,
  CDR_MISCONFIGURATIONS_INDEX_PATTERN,
  CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX,
  CDR_VULNERABILITIES_DATA_VIEW_NAME,
  CDR_VULNERABILITIES_INDEX_PATTERN,
} from '../../common/constants';

const PREVIOUS_VERSION_INDEX_PATTERNS = {
  [CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX]: [],
  [CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX]: [],
};
const CURRENT_VERSION_INDEX_PATTERNS: Record<string, string> = {
  [CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX]: CDR_MISCONFIGURATIONS_INDEX_PATTERN,
  [CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX]: CDR_VULNERABILITIES_INDEX_PATTERN,
};

const DATA_VIEW_TIME_FIELD = '@timestamp';

const getDataViewSafe = async (
  soClient: ISavedObjectsRepository,
  currentSpaceId: string,
  currentSpaceDataViewId: string,
  indexPattern: string,
  logger: Logger
): Promise<SavedObject<DataViewAttributes> | undefined> => {
  try {
    const dataView = await soClient.get<DataViewAttributes>(
      'index-pattern',
      currentSpaceDataViewId,
      {
        namespace: currentSpaceId,
      }
    );

    // Verify user didn't edit the index pattern
    const currentIndexPatterns = dataView.attributes.title.split(',');
    const requiredIndexPatterns = indexPattern.split(',');

    const allExist = requiredIndexPatterns.every((element) =>
      currentIndexPatterns.includes(element)
    );

    if (!allExist) await migrateCdrDataViews(soClient, logger);

    return dataView;
  } catch (e) {
    return;
  }
};

const getCurrentSpaceId = (
  spacesService: SpacesServiceStart | undefined,
  request: KibanaRequest
): string => {
  return spacesService?.getSpaceId(request) || 'default';
};

export const installDataView = async (
  esClient: ElasticsearchClient,
  soClient: ISavedObjectsRepository,
  spacesService: SpacesServiceStart | undefined,
  dataViewsService: DataViewsServerPluginStart,
  request: KibanaRequest,
  dataViewName: string,
  indexPattern: string,
  dataViewId: string,
  logger: Logger
) => {
  try {
    const currentSpaceId = await getCurrentSpaceId(spacesService, request);
    const currentSpaceDataViewId = `${dataViewId}-${currentSpaceId}`;

    const isDataViewExists = await getDataViewSafe(
      soClient,
      currentSpaceId,
      currentSpaceDataViewId,
      indexPattern,
      logger
    );

    if (isDataViewExists) return;

    logger.info(`Creating and saving data view with ID: ${currentSpaceDataViewId}`);
    // const esClient = coreStart.elasticsearch.client.asInternalUser;
    const dataViewsClient = await dataViewsService.dataViewsServiceFactory(
      soClient,
      esClient,
      request,
      true
    );
    await dataViewsClient.createAndSave(
      {
        id: currentSpaceDataViewId,
        title: indexPattern,
        name: `${dataViewName} - ${currentSpaceId} `,
        namespaces: [currentSpaceId],
        allowNoIndex: true,
        timeFieldName: DATA_VIEW_TIME_FIELD,
      },
      true
    );
  } catch (error) {
    logger.error(`Failed to setup data view`, error);
  }
};

export const setupCdrDataViews = async (
  esClient: ElasticsearchClient,
  soClient: ISavedObjectsRepository,
  spacesService: SpacesServiceStart | undefined,
  dataViewsService: DataViewsServerPluginStart,
  request: KibanaRequest,
  logger: Logger
) => {
  installDataView(
    esClient,
    soClient,
    spacesService,
    dataViewsService,
    request,
    CDR_MISCONFIGURATIONS_DATA_VIEW_NAME,
    CDR_MISCONFIGURATIONS_INDEX_PATTERN,
    CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
    logger
  );

  installDataView(
    esClient,
    soClient,
    spacesService,
    dataViewsService,
    request,
    CDR_VULNERABILITIES_DATA_VIEW_NAME,
    CDR_VULNERABILITIES_INDEX_PATTERN,
    CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX,
    logger
  );
};

const migrateIndexPattern = (previousIndexPattern: string, newPattern: string): string => {
  const previousPatternsArray = previousIndexPattern.split(',');
  const newPatternsArray = newPattern.split(',');

  newPatternsArray.forEach((pattern) => {
    if (!previousPatternsArray.includes(pattern)) {
      previousPatternsArray.push(pattern);
    }
  });

  // Join the array back into a string with elements separated by commas
  const updatedIndexPattern = previousPatternsArray.join(',');

  return updatedIndexPattern;
};

export const migrateCdrDataViews = async (soClient: ISavedObjectsRepository, logger: Logger) => {
  logger.info('Migrating CDR data views');
  try {
    const migrationPromises = Object.entries(PREVIOUS_VERSION_INDEX_PATTERNS).map(
      async ([dataViewID, oldIndexPatternArray]) => {
        const patternPromises = oldIndexPatternArray.map(async (oldIndexPattern) => {
          // Retrieve all data views with the old index pattern from all spaces
          const dataViews = await soClient.find<DataViewAttributes>({
            type: 'index-pattern',
            search: oldIndexPattern,
            searchFields: ['title'], // title contains the index pattern
            namespaces: ['*'],
          });

          // For each data view with the old index pattern, update the index pattern to contain the new one
          const updatePromises = dataViews.saved_objects.map(async (dataView) => {
            await soClient.update(
              'index-pattern',
              dataView.id,
              {
                ...dataView.attributes,
                title: migrateIndexPattern(
                  dataView.attributes.title,
                  CURRENT_VERSION_INDEX_PATTERNS[dataViewID]
                ),
                timeFieldName: DATA_VIEW_TIME_FIELD,
                managed: true,
              },
              {
                namespace: dataView.namespaces![0],
              }
            );
          });

          await Promise.all(updatePromises);
        });

        await Promise.all(patternPromises);
      }
    );

    // Ensure all migration promises are resolved
    await Promise.all(migrationPromises);
  } catch (error) {
    logger.error('Failed to migrate CDR data views', error);
  }
};
