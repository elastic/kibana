/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
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
import {
  transformCaseConnectorToEsConnector,
  transformESConnectorToCaseConnector,
} from '../helpers';
import { CASE_CONFIGURE_SAVED_OBJECT } from '../../../../saved_object_types';

export function initPostCaseConfigure({
  caseConfigureService,
  caseService,
  connectorMappingsService,
  router,
}: RouteDeps) {
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

        console.log('hello 111');
        const myCaseConfigure = await caseConfigureService.find({ client });
        console.log('hello 222');
        const myConnectorMappings = await connectorMappingsService.find({
          client,
          options: {
            hasReference: {
              type: CASE_CONFIGURE_SAVED_OBJECT,
              name: `associated-${CASE_CONFIGURE_SAVED_OBJECT}`,
              id: post.id,
            },
          },
        });
        console.log('myCaseConfigure', JSON.stringify(myCaseConfigure));
        console.log('myConnectorMappings', JSON.stringify(myConnectorMappings));
        if (myCaseConfigure.saved_objects.length > 0) {
          await Promise.all(
            myCaseConfigure.saved_objects.map((cc) =>
              caseConfigureService.delete({ client, caseConfigureId: cc.id })
            )
          );
        }
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { email, full_name, username } = await caseService.getUser({ request, response });

        const creationDate = new Date().toISOString();
        const post = await caseConfigureService.post({
          client,
          attributes: {
            ...query,
            connector: transformCaseConnectorToEsConnector(query.connector),
            created_at: creationDate,
            created_by: { email, full_name, username },
            updated_at: null,
            updated_by: null,
          },
        });

        // const connectorMappings = await connectorMappingsService.post({
        //   client,
        //   attributes: {
        //     mappings: [
        //       {
        //         source: 'title',
        //         target: 'short_description',
        //         action_type: 'overwrite',
        //       },
        //       {
        //         source: 'description',
        //         target: 'description',
        //         action_type: 'overwrite',
        //       },
        //       {
        //         source: 'comments',
        //         target: 'comments',
        //         action_type: 'overwrite',
        //       },
        //     ],
        //   },
        //   references: [
        //     {
        //       type: CASE_CONFIGURE_SAVED_OBJECT,
        //       name: `associated-${CASE_CONFIGURE_SAVED_OBJECT}`,
        //       id: post.id,
        //     },
        //   ],
        // });
        // console.log('THE MAPPINGS?!', JSON.stringify(connectorMappings));

        return response.ok({
          body: CaseConfigureResponseRt.encode({
            ...post.attributes,
            // Reserve for future implementations
            connector: transformESConnectorToCaseConnector(post.attributes.connector),
            version: post.version ?? '',
          }),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
