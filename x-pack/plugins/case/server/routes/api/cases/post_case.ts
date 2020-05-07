/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { flattenCaseSavedObject, transformNewCase, wrapError, escapeHatch } from '../utils';

import { CasePostRequestRt, throwErrors, excess, CaseResponseRt } from '../../../../common/api';
import { buildCaseUserActionItem } from '../../../services/user_actions/helpers';
import { RouteDeps } from '../types';
import { CASES_URL } from '../../../../common/constants';
import { getConnectorId } from './helpers';

export function initPostCaseApi({
  caseService,
  caseConfigureService,
  router,
  userActionService,
}: RouteDeps) {
  router.post(
    {
      path: CASES_URL,
      validate: {
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        console.log('????????0', JSON.stringify(request.body));
        console.log('????????1', request);
        const client = context.core.savedObjects.client;
        const query = pipe(
          excess(CasePostRequestRt).decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );
        console.log('????????1');

        const { username, full_name, email } = await caseService.getUser({ request, response });
        console.log('????????2');
        const createdDate = new Date().toISOString();
        const myCaseConfigure = await caseConfigureService.find({ client });
        const connectorId = getConnectorId(myCaseConfigure);
        const newCase = await caseService.postNewCase({
          client,
          attributes: transformNewCase({
            createdDate,
            newCase: query,
            username,
            full_name,
            email,
            connectorId,
          }),
        });

        await userActionService.postUserActions({
          client,
          actions: [
            buildCaseUserActionItem({
              action: 'create',
              actionAt: createdDate,
              actionBy: { username, full_name, email },
              caseId: newCase.id,
              fields: ['description', 'status', 'tags', 'title'],
              newValue: JSON.stringify(query),
            }),
          ],
        });

        return response.ok({
          body: CaseResponseRt.encode(
            flattenCaseSavedObject({
              savedObject: newCase,
            })
          ),
        });
      } catch (error) {
        console.log('ERRRRRR', error)
        return response.customError(wrapError(error));
      }
    }
  );
}
