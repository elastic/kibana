/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ISavedObjectsRepository,
  SavedObject,
  type CoreSetup,
  type KibanaRequest,
  type Logger,
} from '@kbn/core/server';

import { DataViewAttributes } from '@kbn/data-views-plugin/common';
import {
  CDR_MISSCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
  CDR_MISSCONFIGURATIONS_INDEX_PATTERN,
  CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX,
  CDR_VULNERABILITIES_INDEX_PATTERN,
} from '../../common/constants';
import type { CspServerPluginStart, CspServerPluginStartDeps } from '../types';

const PREVIOUS_VERSION_INDEX_PATTERNS = {
  [CDR_MISSCONFIGURATIONS_DATA_VIEW_ID_PREFIX]: [],
  [CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX]: [],
};
const CURRENT_VERSION_INDEX_PATTERNS: Record<string, string> = {
  [CDR_MISSCONFIGURATIONS_DATA_VIEW_ID_PREFIX]: CDR_MISSCONFIGURATIONS_INDEX_PATTERN,
  [CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX]: CDR_VULNERABILITIES_INDEX_PATTERN,
};

const DATA_VIEW_TIME_FIELD = '@timestamp';

const getDataViewSafe = async (
  soClient: ISavedObjectsRepository,
  currentSpaceId: string,
  currentSpaceDataViewId: string
): Promise<SavedObject<DataViewAttributes> | undefined> => {
  try {
    const dataView = await soClient.get<DataViewAttributes>(
      'index-pattern',
      currentSpaceDataViewId,
      {
        namespace: currentSpaceId,
      }
    );
    return dataView;
  } catch (e) {
    return;
  }
};

const getCurrentSpaceId = async (
  startDeps: CspServerPluginStartDeps,
  request: KibanaRequest
): Promise<string> => {
  return (await startDeps.spaces?.spacesService.getSpaceId(request)) || 'default';
};

export const setupCdrDataView = async (
  core: CoreSetup<CspServerPluginStartDeps, CspServerPluginStart>,
  request: KibanaRequest,
  dataViewName: string,
  indexPattern: string,
  dataViewId: string,
  logger: Logger
) => {
  const [coreStart, startDeps] = await core.getStartServices();
  const soClient = coreStart.savedObjects.createInternalRepository();

  try {
    const currentSpaceId = await getCurrentSpaceId(startDeps, request);
    const currentSpaceDataViewId = `${dataViewId}-${currentSpaceId}`;

    const isDataViewExists = await getDataViewSafe(
      soClient,
      currentSpaceId,
      currentSpaceDataViewId
    );

    if (isDataViewExists) return;

    logger.info(`Creating and saving data view with ID: ${currentSpaceDataViewId}`);
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const dataViewsClient = await startDeps.dataViews.dataViewsServiceFactory(
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

const migrateIndexPattern = (oldPattern: string, newPattern: string): string => {
  const indexPatternsArray = oldPattern.split(',');

  if (!indexPatternsArray.includes(newPattern)) {
    indexPatternsArray.push(newPattern);
  }

  return indexPatternsArray.join(',');
};

export const migrateCdrDataViews = async (soClient: ISavedObjectsRepository, logger: Logger) => {
  logger.info('Migrating CDR data views');
  try {
    Object.entries(PREVIOUS_VERSION_INDEX_PATTERNS).forEach(
      ([dataViewID, oldIndexPAtternArray]) => {
        oldIndexPAtternArray.map(async (oldIndexPattern) => {
          // Retrieve all data views with the old index pattern from all spaces
          const dataViews = await soClient.find<DataViewAttributes>({
            type: 'index-pattern',
            search: oldIndexPattern,
            searchFields: ['title'], // title contains the index pattern
            namespaces: ['*'],
          });

          // For each data view with the old index pattern, update the index pattern to contain the new one
          dataViews.saved_objects.map(async (dataView) => {
            console.log({ dataView });
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
              },
              {
                namespace: dataView.namespaces![0],
              }
            );
          });
        });
      }
    );
  } catch (error) {
    logger.error('Failed to migrate CDR data views', error);
  }
};
