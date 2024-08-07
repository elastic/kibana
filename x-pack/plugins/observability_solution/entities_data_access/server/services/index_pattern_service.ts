/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { EntityDefinition } from '@kbn/entities-schema';
import {
  DatasetString,
  ENTITY_BASE_PREFIX,
  ENTITY_HISTORY,
  ENTITY_LATEST,
  EntityDefinitionsNotFoundForType,
  SO_ENTITY_DEFINITION_TYPE,
  SchemaVersionString,
} from '../../common';

interface Options {
  datasets?: DatasetString | DatasetString[] | 'all';
  schemaVersion?: SchemaVersionString | SchemaVersionString[] | 'all';
}

interface Result {
  latestIndexPattern?: string;
  historyIndexPattern?: string;
}

export interface EntityIndexPatternService {
  indexPattern(options?: Options): Result;
  indexPatternByDefinitionId(definitionId: string | string[], options?: Options): Result;
  indexPatternByType(
    type: string | string[],
    options: Options & { soClient: SavedObjectsClientContract }
  ): Promise<Result>;
}

function translateDatasetsOption(datasets: Options['datasets']) {
  if (!datasets || datasets === 'all') {
    return [ENTITY_LATEST, ENTITY_HISTORY];
  }
  return Array.isArray(datasets) ? datasets : [datasets];
}

function translateSchemaVersionOption(schemaVersion: Options['schemaVersion']) {
  if (!schemaVersion || schemaVersion === 'all') {
    return ['*'] as const;
  }
  return Array.isArray(schemaVersion) ? schemaVersion : [schemaVersion];
}

async function findAllDefinitionsByType(
  type: string | string[],
  soClient: SavedObjectsClientContract
) {
  const types = Array.isArray(type) ? type : [type];

  let total = 0;
  let page = 1;
  const definitions = [];

  do {
    const response = await soClient.find<EntityDefinition>({
      page,
      type: SO_ENTITY_DEFINITION_TYPE,
      filter: `${SO_ENTITY_DEFINITION_TYPE}.attributes.type:(${types.join(' or ')})`,
    });

    definitions.push(...response.saved_objects.map(({ attributes }) => attributes.id));
    total = response.total;
    page = page + 1;
  } while (definitions.length < total);

  return definitions;
}

function splitByDataset(indices: string[]) {
  const latestIndices = indices.filter((index) => index.includes(`.${ENTITY_LATEST}.`));
  const historyIndices = indices.filter((index) => index.includes(`.${ENTITY_HISTORY}.`));

  const result: Result = {};

  if (latestIndices.length !== 0) {
    result.latestIndexPattern = latestIndices.join(',');
  }

  if (historyIndices.length !== 0) {
    result.historyIndexPattern = historyIndices.join(',');
  }

  return result;
}

function indexPattern(options?: Options): Result {
  const datasets = translateDatasetsOption(options?.datasets);
  const schemaVersion = translateSchemaVersionOption(options?.schemaVersion);

  return splitByDataset(
    datasets
      .map((dataset) =>
        schemaVersion.map((version) => `.${ENTITY_BASE_PREFIX}.${version}.${dataset}.*`)
      )
      .flat()
  );
}

function indexPatternByDefinitionId(definitionId: string | string[], options?: Options): Result {
  const datasets = translateDatasetsOption(options?.datasets);
  const schemaVersion = translateSchemaVersionOption(options?.schemaVersion);
  const definitionIds = Array.isArray(definitionId) ? definitionId : [definitionId];

  return splitByDataset(
    definitionIds
      .map((id) =>
        datasets.map((dataset) =>
          schemaVersion.map(
            (version) =>
              `.${ENTITY_BASE_PREFIX}.${version}.${dataset}.${id}${
                dataset === 'history' ? '.*' : ''
              }`
          )
        )
      )
      .flat()
      .flat()
  );
}

async function indexPatternByType(
  type: string | string[],
  options: Options & { soClient: SavedObjectsClientContract }
): Promise<Result> {
  const definitionIds = await findAllDefinitionsByType(type, options.soClient);

  if (definitionIds.length === 0) {
    throw new EntityDefinitionsNotFoundForType(type);
  }

  return indexPatternByDefinitionId(definitionIds, options);
}

export function createIndexPatternService(): EntityIndexPatternService {
  return {
    indexPattern,
    indexPatternByDefinitionId,
    indexPatternByType,
  };
}
