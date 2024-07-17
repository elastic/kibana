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
import { RegisterServicesParams } from '../types';

type SchemaVersionString = `v${number}`;

interface Options {
  datasets?: 'all' | typeof ENTITY_LATEST | typeof ENTITY_HISTORY;
  schemaVersion?: SchemaVersionString | SchemaVersionString[] | 'all';
}

function translateDatasetsOption(datasets: Options['datasets']) {
  if (!datasets || datasets === 'all') {
    return ['*'] as const;
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
  const definitions = [];

  let response = await soClient.find<EntityDefinition>({
    type: SO_ENTITY_DEFINITION_TYPE,
    page: 1,
    filter: `${SO_ENTITY_DEFINITION_TYPE}.attributes.type:(${type})`,
  });

  const total = response.total;
  let page = response.page;
  definitions.push(...response.saved_objects);

  while (definitions.length < total) {
    response = await soClient.find<EntityDefinition>({
      type: SO_ENTITY_DEFINITION_TYPE,
      page: page + 1,
      filter: `${SO_ENTITY_DEFINITION_TYPE}.attributes.type:(${type})`,
    });

    definitions.push(...response.saved_objects);
    page = response.page;
  }

  return definitions.map((definition) => definition.attributes.id);
}

export function createIndexPatternService(params: RegisterServicesParams) {
  function indexPattern(options?: Options) {
    const datasets = translateDatasetsOption(options?.datasets);
    const schemaVersion = translateSchemaVersionOption(options?.schemaVersion);

    return datasets
      .map((dataset) =>
        schemaVersion.map(
          (version) =>
            `.${ENTITY_BASE_PREFIX}.${version}.${dataset}${dataset === 'history' ? '.*' : ''}`
        )
      )
      .flat()
      .join(',');
  }

  function indexPatternByDefinitionId(definitionId: string, options?: Options) {
    const datasets = translateDatasetsOption(options?.datasets);
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
    options: Partial<Options> & { soClient: SavedObjectsClientContract }
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
