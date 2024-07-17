/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useCallback } from 'react';
import { ENTITY_DEFINITION_ID } from './entity_model';

const PIPELINE_ID = `${ENTITY_DEFINITION_ID}-latest@platform`;
const INDEX_COMPONENT_NAME = `${ENTITY_DEFINITION_ID}-latest@platform`;
const MODEL_FIELD = 'text_field';
const TARGET_INDEX_FIELD = 'user.name';
const TARGET_INDEX_EMBEDDINGS_FIELD = `test_user_name_embeddings`;
const MODEL_ID = '.multilingual-e5-small';

export const useVectorSearch = () => {
  const http = useKibana().services.http;

  const install = useCallback(() => {
    if (!http) return Promise.resolve();
    return installModel(http);
  }, [http]);

  const installSettings = useCallback(() => {
    if (!http) return Promise.resolve();
    return installModelSettings(http);
  }, [http]);

  return { installModel: install, installSettings };
};

const createComponentTemplate = async (http: HttpSetup) =>
  http.fetch(`/api/index_management/component_templates`, {
    method: 'POST',
    body: JSON.stringify({
      name: INDEX_COMPONENT_NAME,
      template: {
        mappings: {
          properties: {
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
          },
        },
      },
      _kbnMeta: { usedBy: [ENTITY_DEFINITION_ID], isManaged: true },
    }),
  });

const installModelSettings = async (http: HttpSetup) => {
  console.log('create ingest pipeline');
  await createIngestPipelineAPI(http);

  console.log('create component template');
  await createComponentTemplate(http);
};

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
    body: JSON.stringify({
      input: {
        field_names: ['text_field'],
      },
    }),
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
