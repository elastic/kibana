/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndicesPutIndexTemplateRequest,
  MappingTypeMapping,
  IndicesIndexSettings,
  IndicesCreateRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core/server';

const getIndexSettings = (settings: IndicesIndexSettings | null | undefined) => {
  if (!settings) {
    return {};
  }
  const requestSettings = { ...settings };

  delete requestSettings.version;
  delete requestSettings.uuid;
  delete requestSettings.creation_date;
  delete requestSettings.creation_date_string;
  delete requestSettings.provided_name;
  if (requestSettings.index) {
    requestSettings.index = getIndexSettings(requestSettings.index);
  }

  return requestSettings;
};

const getMappings = (
  existingIndexMappings: MappingTypeMapping | undefined,
  newMappings: MappingTypeMapping
) => {
  const properties = { ...(existingIndexMappings?.properties ?? {}), ...newMappings.properties };
  return {
    ...(existingIndexMappings ?? {}),
    properties,
  };
};

export const createDataStream = async (
  client: IScopedClusterClient,
  {
    indexName,
    indexTemplate,
    newMappings,
  }: {
    indexName: string;
    indexTemplate?: string | null;
    newMappings: MappingTypeMapping;
  }
) => {
  const newName = `${indexName}-fixup-${new Date().getTime()}`;

  let sourceIndices = null;

  const isDataStream = indexTemplate != null;

  if (isDataStream) {
    const {
      index_templates: [{ index_template: existingIndexTemplate }],
    } = await client.asCurrentUser.indices.getIndexTemplate({
      name: indexTemplate,
    });

    sourceIndices = existingIndexTemplate.index_patterns;
    const request: IndicesPutIndexTemplateRequest = {
      ...(existingIndexTemplate ?? {}),
      template: {
        mappings: getMappings(existingIndexTemplate.template?.mappings, newMappings),
        aliases: existingIndexTemplate.template?.aliases,
        settings: getIndexSettings(existingIndexTemplate.template?.settings),
      },
      name: newName,
      index_patterns: newName,
    };

    await client.asCurrentUser.indices.putIndexTemplate(request);

    await client.asCurrentUser.indices.createDataStream({
      name: newName,
    });
  } else {
    const { [indexName]: existingIndex } = await client.asCurrentUser.indices.get({
      index: indexName,
    });
    sourceIndices = indexName;
    const request: IndicesCreateRequest = {
      index: newName,
      aliases: existingIndex.aliases,
      mappings: getMappings(existingIndex.mappings, newMappings),
      settings: getIndexSettings(existingIndex.settings),
    };

    await client.asCurrentUser.indices.create(request);
  }

  const { task: taskId } = await client.asCurrentUser.reindex({
    wait_for_completion: false,
    refresh: true,
    source: { index: sourceIndices },
    conflicts: 'proceed',
    dest: { index: newName, op_type: isDataStream ? 'create' : undefined },
  });

  if (taskId) {
    const taskIdResp = await client.asCurrentUser.tasks.get({ task_id: `${taskId}` });

    return {
      result: { taskId, taskResult: taskIdResp, targetIndex: newName },
    };
  } else {
    return null;
  }
};
