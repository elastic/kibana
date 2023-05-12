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
  const newIndexTemplateName = `${indexName}-fixup-${new Date().getTime()}`;
  // const isNewIndexTemplateNameOccupied = true;
  let request: IndicesPutIndexTemplateRequest | null = null;
  // while (isNewIndexTemplateNameOccupied) {
  //   isNewIndexTemplateNameOccupied = await client.asCurrentUser.indices.existsIndexTemplate({
  //     name: newIndexTemplateName,
  //   });
  //   if (isNewIndexTemplateNameOccupied) {
  //     newIndexTemplateName += `-fixup-${new Date().toISOString()}`;
  //   }
  // }
  if (indexTemplate) {
    const {
      index_templates: [{ index_template: existingIndexTemplate }],
    } = await client.asCurrentUser.indices.getIndexTemplate({
      name: indexTemplate,
    });
    request = {
      ...(existingIndexTemplate ?? {}),
      template: {
        mappings: { ...existingIndexTemplate.template?.mappings, ...newMappings },
        aliases: existingIndexTemplate.template?.aliases,
        settings: getIndexSettings(existingIndexTemplate.template?.settings),
      },
      name: newIndexTemplateName,
      index_patterns: newIndexTemplateName,
    };
  } else {
    const { [indexName]: existingIndex } = await client.asCurrentUser.indices.get({
      index: indexName,
    });
    request = {
      name: newIndexTemplateName,
      data_stream: {},
      index_patterns: newIndexTemplateName,
      template: {
        aliases: existingIndex.aliases,
        mappings: { ...existingIndex.mappings, ...newMappings },
        settings: getIndexSettings(existingIndex.settings),
      },
    };
  }
  await client.asCurrentUser.indices.putIndexTemplate(request);

  await client.asCurrentUser.indices.createDataStream({
    name: newIndexTemplateName,
  });

  const { task: taskId } = await client.asCurrentUser.reindex({
    wait_for_completion: false,
    refresh: true,
    source: { index: indexName },
    conflicts: 'proceed',
    dest: { index: newIndexTemplateName, op_type: 'create' },
  });

  if (taskId) {
    const taskIdResp = await client.asCurrentUser.tasks.get({ task_id: `${taskId}` });

    return {
      taskId,
      result: taskIdResp,
    };
  } else {
    return null;
  }
};
