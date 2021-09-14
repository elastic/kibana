/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { Pipeline } from '../../../common/types';
import { API_BASE_PATH } from '../../../common/constants';
import { FieldCopyAction } from '../../../common/types';
import { mapToIngestPipeline } from '../../services/mapper';
import { RouteDependencies } from '../../types';

export const registerMapRoute = ({
  router,
}: RouteDependencies): void => {
  router.post(
    {
      path: `${API_BASE_PATH}/map`,
      validate: {
        body: schema.object({
          file: schema.string(),
          copyAction: schema.string(),
        }),
      },
    },
    async (contxt, req, res) => {
      const { file, copyAction } = req.body;
      try {
        const result = mapToIngestPipeline(file, copyAction as FieldCopyAction) as Pipeline;
        return res.ok({ body: JSON.stringify(result) });
      } catch (error) {
        return res.badRequest({ body: error.message });
      }
    }
  );
};
