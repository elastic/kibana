/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import { FieldRenameAction } from '../../common';
import { mapToIngestPipeline } from '../services/mapper';

export function registerMapToIndexPipelineRoute(router: IRouter) {
  router.post(
    {
      path: '/api/ecs_mapper/map/ingest_pipeline',
      validate: {
        body: schema.object({
          file: schema.string(),
          renameAction: schema.string(),
        }),
      },
    },
    async (context, req, res) => {
      const { file, renameAction } = req.body;
      const result = mapToIngestPipeline(file, renameAction as FieldRenameAction);
      return res.ok({ body: result });
    }
  );
}
