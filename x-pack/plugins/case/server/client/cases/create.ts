/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { flattenCaseSavedObject, transformNewCase } from '../../routes/api/utils';

import {
  CasePostRequestRt,
  throwErrors,
  excess,
  CaseResponseRt,
  CaseResponse,
} from '../../../common/api';
import { buildCaseUserActionItem } from '../../services/user_actions/helpers';
import {
  getConnectorFromConfiguration,
  transformCaseConnectorToEsConnector,
} from '../../routes/api/cases/helpers';

import { CaseClientCreate, CaseClientFactoryArguments } from '../types';

export const create = ({
  savedObjectsClient,
  caseService,
  caseConfigureService,
  userActionService,
  request,
}: CaseClientFactoryArguments) => async ({ theCase }: CaseClientCreate): Promise<CaseResponse> => {
  const query = pipe(
    excess(CasePostRequestRt).decode(theCase),
    fold(throwErrors(Boom.badRequest), identity)
  );

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { username, full_name, email } = await caseService.getUser({ request });
  const createdDate = new Date().toISOString();
  const myCaseConfigure = await caseConfigureService.find({ client: savedObjectsClient });
  const caseConfigureConnector = getConnectorFromConfiguration(myCaseConfigure);

  const newCase = await caseService.postNewCase({
    client: savedObjectsClient,
    attributes: transformNewCase({
      createdDate,
      newCase: query,
      username,
      full_name,
      email,
      connector: transformCaseConnectorToEsConnector(query.connector ?? caseConfigureConnector),
    }),
  });

  await userActionService.postUserActions({
    client: savedObjectsClient,
    actions: [
      buildCaseUserActionItem({
        action: 'create',
        actionAt: createdDate,
        actionBy: { username, full_name, email },
        caseId: newCase.id,
        fields: ['description', 'status', 'tags', 'title', 'connector'],
        newValue: JSON.stringify(query),
      }),
    ],
  });

  return CaseResponseRt.encode(
    flattenCaseSavedObject({
      savedObject: newCase,
    })
  );
};
