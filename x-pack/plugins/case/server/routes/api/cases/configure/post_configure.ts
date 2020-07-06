/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import {
  CasesConfigureRequestRt,
  CaseConfigureResponseRt,
  throwErrors,
} from '../../../../../common/api';
import { RouteDeps } from '../../types';
import { wrapError, escapeHatch } from '../../utils';
import { CASE_CONFIGURE_URL } from '../../../../../common/constants';

export function initPostCaseConfigure({ caseConfigureService, caseService, router }: RouteDeps) {
  router.post(
    {
      path: CASE_CONFIGURE_URL,
      validate: {
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        const query = pipe(
          CasesConfigureRequestRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const myCaseConfigure = await caseConfigureService.find({ client });

        if (myCaseConfigure.saved_objects.length > 0) {
          await Promise.all(
            myCaseConfigure.saved_objects.map((cc) =>
              caseConfigureService.delete({ client, caseConfigureId: cc.id })
            )
          );
        }
        const { email, full_name, username } = await caseService.getUser({ request, response });

        const creationDate = new Date().toISOString();
        const post = await caseConfigureService.post({
          client,
          attributes: {
            ...query,
            created_at: creationDate,
            created_by: { email, full_name, username },
            updated_at: null,
            updated_by: null,
          },
        });

        return response.ok({
          body: CaseConfigureResponseRt.encode({ ...post.attributes, version: post.version ?? '' }),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
