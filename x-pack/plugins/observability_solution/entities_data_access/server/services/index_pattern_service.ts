/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { EntityDefinition } from '@kbn/entities-schema';
import {
  ENTITY_BASE_PREFIX,
  ENTITY_HISTORY,
  ENTITY_LATEST,
  SO_ENTITY_DEFINITION_TYPE,
} from '../../common';

type SchemaVersionString = `v${number}`;

export interface EntityIndexPatternService {
  indexPattern(options?: Options): string;
  indexPatternByDefinitionId(definitionId: string, options?: Options): string;
  indexPatternByType(
    type: string,
    options: Options & { soClient: SavedObjectsClientContract }
  ): Promise<string>;
}

export interface Options {
  datasets?: 'all' | typeof ENTITY_LATEST | typeof ENTITY_HISTORY;
  schemaVersion?: SchemaVersionString | SchemaVersionString[] | 'all';
}

function translateDatasetsOption(datasets: Options['datasets'], useWildcard = true) {
  if (!datasets || datasets === 'all') {
    if (useWildcard) {
      return ['*'] as const;
    }
    return [ENTITY_LATEST, ENTITY_HISTORY] as const;
  }
  return [datasets] as const;
}

function translateSchemaVersionOption(schemaVersion: Options['schemaVersion']) {
  if (!schemaVersion || schemaVersion === 'all') {
    return ['*'] as const;
  }

  return Array.isArray(schemaVersion) ? schemaVersion : [schemaVersion];
}

async function findAllDefinitionsByType(type: string, soClient: SavedObjectsClientContract) {
  let total = 0;
  let page = 1;
  const definitions = [];

  do {
    const response = await soClient.find<EntityDefinition>({
      page,
      type: SO_ENTITY_DEFINITION_TYPE,
      filter: `${SO_ENTITY_DEFINITION_TYPE}.attributes.type:(${type})`,
    });

    definitions.push(...response.saved_objects.map(({ attributes }) => attributes.id));
    total = response.total;
    page = page + 1;
  } while (definitions.length < total);

  return definitions;
}

export function createIndexPatternService(): EntityIndexPatternService {
  function indexPattern(options?: Options) {
    const datasets = translateDatasetsOption(options?.datasets);
    const schemaVersion = translateSchemaVersionOption(options?.schemaVersion);

    return datasets
      .map((dataset) =>
        schemaVersion.map((version) => `.${ENTITY_BASE_PREFIX}.${version}.${dataset}.*`)
      )
      .flat()
      .join(',');
  }

  function indexPatternByDefinitionId(definitionId: string, options?: Options) {
    const datasets = translateDatasetsOption(options?.datasets, false);
    const schemaVersion = translateSchemaVersionOption(options?.schemaVersion);

    return datasets
      .map((dataset) =>
        schemaVersion.map(
          (version) =>
            `.${ENTITY_BASE_PREFIX}.${version}.${dataset}.${definitionId}${
              dataset === 'history' ? '.*' : ''
            }`
        )
      )
      .flat()
      .join(',');
  }

  async function indexPatternByType(
    type: string,
    options: Options & { soClient: SavedObjectsClientContract }
  ) {
    const definitionIds = await findAllDefinitionsByType(type, options.soClient);

    if (definitionIds.length === 0) {
      throw new Error(`No entity definitions found for type ${type}`);
    }

    return definitionIds
      .map((definitionId) => indexPatternByDefinitionId(definitionId, options))
      .join(',');
  }

  return {
    indexPattern,
    indexPatternByDefinitionId,
    indexPatternByType,
  };
}
