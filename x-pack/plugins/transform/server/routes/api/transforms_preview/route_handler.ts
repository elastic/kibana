/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { RequestHandler } from '@kbn/core/server';

import type { PostTransformsPreviewRequestSchema } from '../../api_schemas/transforms';
import { isLatestTransform } from '../../../../common/types/transform';
import { isKeywordDuplicate } from '../../../../common/utils/field_utils';

import { wrapError, wrapEsError } from '../../utils/error_utils';

export const routeHandler: RequestHandler<
  undefined,
  undefined,
  PostTransformsPreviewRequestSchema
> = async (ctx, req, res) => {
  try {
    const reqBody = req.body;
    const esClient = (await ctx.core).elasticsearch.client;
    const body = await esClient.asCurrentUser.transform.previewTransform(
      {
        body: reqBody,
      },
      { maxRetries: 0 }
    );
    if (isLatestTransform(reqBody)) {
      // for the latest transform mappings properties have to be retrieved from the source
      const fieldCapsResponse = await esClient.asCurrentUser.fieldCaps(
        {
          index: reqBody.source.index,
          fields: '*',
          include_unmapped: false,
        },
        { maxRetries: 0 }
      );

      const fieldNamesSet = new Set(Object.keys(fieldCapsResponse.fields));

      const fields = Object.entries(
        fieldCapsResponse.fields as Record<string, Record<string, { type: string }>>
      ).reduce((acc, [fieldName, fieldCaps]) => {
        const fieldDefinition = Object.values(fieldCaps)[0];
        const isMetaField = fieldDefinition.type.startsWith('_') || fieldName === '_doc_count';
        if (isMetaField || isKeywordDuplicate(fieldName, fieldNamesSet)) {
          return acc;
        }
        acc[fieldName] = { ...fieldDefinition };
        return acc;
      }, {} as Record<string, { type: string }>);

      body.generated_dest_index.mappings!.properties = fields as Record<
        string,
        estypes.MappingProperty
      >;
    }
    return res.ok({ body });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};
