/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useMlApiContext, useMlKibana } from '../../../contexts/kibana';

export const useFetchPipelines = () => {
  const [pipelineNames, setPipelineNames] = useState<string[]>([]);
  const {
    notifications: { toasts },
  } = useMlKibana();

  const {
    trainedModels: { getAllIngestPipelines },
  } = useMlApiContext();

  useEffect(() => {
    async function fetchPipelines() {
      let names: string[] = [];
      try {
        const results = await getAllIngestPipelines();
        names = Object.keys(results);
        setPipelineNames(names);
      } catch (e) {
        toasts.danger({
          title: i18n.translate(
            'xpack.ml.trainedModels.content.indices.pipelines.fetchIngestPipelinesError',
            {
              defaultMessage: 'Unable to fetch ingest pipelines.',
            }
          ),
          body: e.message,
          toastLifeTimeMs: 5000,
        });
      }
    }

    fetchPipelines();
  }, [getAllIngestPipelines, toasts]);

  return pipelineNames;
};
