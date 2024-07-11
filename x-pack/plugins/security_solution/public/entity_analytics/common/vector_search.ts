/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useCallback } from 'react';

const PIPELINE_ID = 'e5_pipeline';
const MODEL_FIELD = 'text_field';
const TARGET_INDEX_FIELD = 'entity.identityFields.user.name';
const TARGET_INDEX_EMBEDDINGS_FIELD = `test_user_name_embeddings`;
const MODEL_ID = '.multilingual-e5-small';
const DEST_INDEX = '.entities.v1.latest.noop';

export const useVectorSearch = () => {
  const http = useKibana().services.http;

  const install = useCallback(() => {
    if (!http) return Promise.resolve();
    return installModel(http);
  }, [http]);

  return { install };
};

// const updateIndexMappings = async (http: HttpSetup) => {
// http://localhost:5601/api/index_management/mapping/.entities.v1.latest.secsol-ea-entity-store
// {test: {type: "text"}}

const updateIndexMappingsAPI = async (http: HttpSetup) =>
  http.fetch(`/api/index_management/mapping/${DEST_INDEX}`, {
    method: 'PUT',
    body: JSON.stringify({
      [TARGET_INDEX_EMBEDDINGS_FIELD]: {
        properties: {
          predicted_value: {
            type: 'dense_vector',
            index: true,
            similarity: 'cosine',
          },
          model_id: {
            type: 'text',
          },
        },
      },
    }),
  });

const updateIndexSettingsAPI = async (http: HttpSetup) =>
  http.fetch(`/api/index_management/settings/${DEST_INDEX}`, {
    method: 'PUT',
    body: JSON.stringify({
      settings: {
        default_pipeline: PIPELINE_ID,
      },
    }),
  });

const installModel = async (http: HttpSetup) => {
  const [model] = await getModelAPI(http);
  if (model) {
    console.log('-------------- model already installed');
  } else {
    console.log('install model api call');
    await installModelAPI(http);
  }

  console.log('await for model to be ready');
  await waitForModelInstallation(http);

  console.log('deploy model api call');
  await deployModelAPI(http);

  console.log('create ingest pipeline');
  await createIngestPipelineAPI(http);

  // TODO It doesn't work because it depends on the transform and transform pipeline to create the index before we can update it.
  // The transform also creates 4 indices.
  // console.log('update index mappings');
  // await updateIndexMappingsAPI(http);

  // console.log('update index settings');
  // await updateIndexSettingsAPI(http);
};

const waitForModelInstallation = async (http: HttpSetup) => {
  let [tempModel] = await getModelAPI(http);

  while (!tempModel.fully_defined) {
    console.log('waiting 2 seconds for model installation...');
    await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2 seconds
    [tempModel] = await getModelAPI(http);
  }
};

const getModelAPI = (http: HttpSetup) =>
  http
    .fetch(`/internal/ml/trained_models/${MODEL_ID}`, {
      version: '1',
      method: 'GET',
      query: {
        include: 'definition_status',
      },
    })
    .catch((error) => {
      if (error.body.statusCode === 404) {
        return [];
      } else {
        throw error;
      }
    });

const installModelAPI = (http: HttpSetup) =>
  http.fetch(`/internal/ml/trained_models/install_elastic_trained_model/${MODEL_ID}`, {
    version: '1',
    method: 'POST',
    // body: JSON.stringify({
    //   input: {
    //     field_names: ['text_field'],
    //   },
    // }),
  });

const deployModelAPI = (http: HttpSetup) =>
  http.fetch(`/internal/ml/trained_models/${MODEL_ID}/deployment/_start`, {
    version: '1',
    method: 'POST',
    query: {
      number_of_allocations: 1,
      threads_per_allocation: 1,
      priority: 'normal',
      deployment_id: MODEL_ID, // can we change the deployment_id?
    },
  });

const createIngestPipelineAPI = async (http: HttpSetup) =>
  http.fetch(`/api/ingest_pipelines`, {
    method: 'POST',
    body: JSON.stringify({
      name: PIPELINE_ID,
      processors: [
        {
          inference: {
            model_id: MODEL_ID,
            target_field: TARGET_INDEX_EMBEDDINGS_FIELD,
            field_map: {
              [TARGET_INDEX_FIELD]: MODEL_FIELD,
            },
          },
        },
      ],
    }),
  });
