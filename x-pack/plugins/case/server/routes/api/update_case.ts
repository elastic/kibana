/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { SavedObject } from 'kibana/server';
import Boom from 'boom';
import { wrapError } from './utils';
import { RouteDeps } from '.';
import { UpdateCaseArguments } from './schema';
import { CaseAttributes, UpdatedCaseTyped, Writable } from './types';

interface UpdateCase extends Writable<UpdatedCaseTyped> {
  [key: string]: any;
}

export function initUpdateCaseApi({ caseService, router }: RouteDeps) {
  router.patch(
    {
      path: '/api/cases/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: UpdateCaseArguments,
      },
    },
    async (context, request, response) => {
      let theCase: SavedObject<CaseAttributes>;
      try {
        theCase = await caseService.getCase({
          client: context.core.savedObjects.client,
          caseId: request.params.id,
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }

      if (request.body.version !== theCase.version) {
        return response.customError(
          wrapError(
            Boom.conflict(
              'This case has been updated. Please refresh before saving additional updates.'
            )
          )
        );
      }
      const updateCase: UpdateCase = request.body.case;
      const currentCase = theCase.attributes;
      Object.keys(updateCase).forEach(key => {
        if (
          key === 'tags' &&
          updateCase.tags &&
          updateCase.tags.length === currentCase.tags.length &&
          updateCase.tags.every((element, index) => element === currentCase.tags[index])
        ) {
          delete updateCase.tags;
        } else if (updateCase[key] === currentCase[key]) {
          delete updateCase[key];
        }
      });
      if (Object.keys(updateCase).length > 0) {
        try {
          const updatedCase = await caseService.updateCase({
            client: context.core.savedObjects.client,
            caseId: request.params.id,
            updatedAttributes: {
              ...updateCase,
              updated_at: new Date().toISOString(),
            },
          });
          return response.ok({ body: { ...updatedCase.attributes, version: updatedCase.version } });
        } catch (error) {
          return response.customError(wrapError(error));
        }
      }
      return response.customError(
        wrapError(Boom.notAcceptable('All update fields are identical to current version.'))
      );
    }
  );
}
