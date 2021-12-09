/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  MATRIX_HISTOGRAM_TEMPLATES,
  MATRIX_HISTOGRAM_TEMPLATE_TYPE,
} from '../../../../common/constants';
import { MatrixHistogramTemplateSavedObject } from '../../../../common/types/matrix_histogram_templates';
import { SecuritySolutionPluginRouter } from '../../../types';

export function getMatrixHistogramTemplates(router: SecuritySolutionPluginRouter) {
  router.get(
    {
      path: `${MATRIX_HISTOGRAM_TEMPLATES}`,
      validate: {
        params: schema.object({}),
      },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

      const templates = await savedObjectsClient.find<MatrixHistogramTemplateSavedObject>({
        type: MATRIX_HISTOGRAM_TEMPLATE_TYPE,
        sortField: 'updated_at',
        sortOrder: 'desc',
        search: '*',
        searchFields: ['title'],
        fields: ['*'],
        hasReference: [{ type: 'tag', id: '6853a880-5451-11ec-b0fd-2f7a10a18ba6' }], // id matches anyone in tag.security_solution.ts
      });
      return response.ok({
        body: {
          templates: templates.saved_objects,
        },
      });
    }
  );
}
