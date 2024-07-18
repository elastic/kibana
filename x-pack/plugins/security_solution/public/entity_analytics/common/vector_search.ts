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

const INDEX_COMPONENT_NAME = `${ENTITY_DEFINITION_ID}-latest@platform`;
const TARGET_INDEX_EMBEDDINGS_FIELD = `test_user_name_embeddings`;
const MODEL_ID = '.multilingual-e5-small';
const INFERENCE_ID = 'entity_store_e5_small';

export const useVectorSearch = () => {
  const http = useKibana().services.http;

  const installCallback = useCallback(() => {
    if (!http) return Promise.resolve();
    return install(http);
  }, [http]);

  return { installVectorSearch: installCallback };
};

const install = async (http: HttpSetup) => {
  await createComponentTemplateAPI(http);
  await installModelAPI(http);
};

const createComponentTemplateAPI = async (http: HttpSetup) =>
  http.fetch(`/api/index_management/component_templates`, {
    method: 'POST',
    body: JSON.stringify({
      name: INDEX_COMPONENT_NAME,
      template: {
        mappings: {
          properties: {
            [TARGET_INDEX_EMBEDDINGS_FIELD]: {
              type: 'semantic_text',
              inference_id: INFERENCE_ID,
            },
          },
        },
      },
      _kbnMeta: { usedBy: [ENTITY_DEFINITION_ID], isManaged: true },
    }),
  });

const installModelAPI = async (http: HttpSetup) => {
  return http.fetch(`/internal/ml/_inference/text_embedding/${INFERENCE_ID}`, {
    method: 'PUT',
    body: JSON.stringify({
      service: 'elasticsearch',
      service_settings: {
        num_allocations: 1,
        num_threads: 1,
        model_id: MODEL_ID,
      },
    }),
    version: '1',
  });
};
