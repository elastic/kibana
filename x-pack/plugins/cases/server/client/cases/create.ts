/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { SavedObjectsClientContract, Logger } from 'src/core/server';
import { flattenCaseSavedObject, transformNewCase } from '../../routes/api/utils';

import {
  throwErrors,
  excess,
  CaseResponseRt,
  CaseResponse,
  CasesClientPostRequestRt,
  CasePostRequest,
  CaseType,
  User,
} from '../../../common';
import { buildCaseUserActionItem } from '../../services/user_actions/helpers';
import {
  getConnectorFromConfiguration,
  transformCaseConnectorToEsConnector,
} from '../../routes/api/cases/helpers';

import {
  CaseConfigureServiceSetup,
  CaseServiceSetup,
  CaseUserActionServiceSetup,
} from '../../services';
import { createCaseError } from '../../common/error';
import { ENABLE_CASE_CONNECTOR } from '../../../common/constants';

interface CreateCaseArgs {
  caseConfigureService: CaseConfigureServiceSetup;
  caseService: CaseServiceSetup;
  user: User;
  savedObjectsClient: SavedObjectsClientContract;
  userActionService: CaseUserActionServiceSetup;
  theCase: CasePostRequest;
  logger: Logger;
}

/**
 * Creates a new case.
 */
export const create = async ({
  savedObjectsClient,
  caseService,
  caseConfigureService,
  userActionService,
  user,
  theCase,
  logger,
}: CreateCaseArgs): Promise<CaseResponse> => {
  // default to an individual case if the type is not defined.
  const { type = CaseType.individual, ...nonTypeCaseFields } = theCase;

  if (!ENABLE_CASE_CONNECTOR && type === CaseType.collection) {
    throw Boom.badRequest(
      'Case type cannot be collection when the case connector feature is disabled'
    );
  }

  const query = pipe(
    // decode with the defaulted type field
    excess(CasesClientPostRequestRt).decode({
      type,
      ...nonTypeCaseFields,
    }),
    fold(throwErrors(Boom.badRequest), identity)
  );

  try {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { username, full_name, email } = user;
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
          fields: ['description', 'status', 'tags', 'title', 'connector', 'settings'],
          newValue: JSON.stringify(query),
        }),
      ],
    });

    return CaseResponseRt.encode(
      flattenCaseSavedObject({
        savedObject: newCase,
      })
    );
  } catch (error) {
    throw createCaseError({ message: `Failed to create case: ${error}`, error, logger });
  }
};
