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

import { SavedObjectsUtils } from '../../../../../../src/core/server';

import {
  throwErrors,
  excess,
  CaseResponseRt,
  CaseResponse,
  CasesClientPostRequestRt,
  CasePostRequest,
  CaseType,
  OWNER_FIELD,
} from '../../../common';
import { buildCaseUserActionItem } from '../../services/user_actions/helpers';
import { ensureAuthorized, getConnectorFromConfiguration } from '../utils';

import { createCaseError } from '../../common/error';
import { Operations } from '../../authorization';
import { ENABLE_CASE_CONNECTOR } from '../../../common/constants';
import {
  flattenCaseSavedObject,
  transformCaseConnectorToEsConnector,
  transformNewCase,
} from '../../common';
import { CasesClientArgs } from '..';

/**
 * Creates a new case.
 *
 * @ignore
 */
export const create = async (
  data: CasePostRequest,
  clientArgs: CasesClientArgs
): Promise<CaseResponse> => {
  const {
    savedObjectsClient,
    caseService,
    caseConfigureService,
    userActionService,
    user,
    logger,
    authorization: auth,
    auditLogger,
  } = clientArgs;

  // default to an individual case if the type is not defined.
  const { type = CaseType.individual, ...nonTypeCaseFields } = data;

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
    const savedObjectID = SavedObjectsUtils.generateId();

    await ensureAuthorized({
      operation: Operations.createCase,
      owners: [query.owner],
      authorization: auth,
      auditLogger,
      savedObjectIDs: [savedObjectID],
    });

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { username, full_name, email } = user;
    const createdDate = new Date().toISOString();
    const myCaseConfigure = await caseConfigureService.find({ soClient: savedObjectsClient });
    const caseConfigureConnector = getConnectorFromConfiguration(myCaseConfigure);

    const newCase = await caseService.postNewCase({
      soClient: savedObjectsClient,
      attributes: transformNewCase({
        createdDate,
        newCase: query,
        username,
        full_name,
        email,
        connector: transformCaseConnectorToEsConnector(query.connector ?? caseConfigureConnector),
      }),
      id: savedObjectID,
    });

    await userActionService.bulkCreate({
      soClient: savedObjectsClient,
      actions: [
        buildCaseUserActionItem({
          action: 'create',
          actionAt: createdDate,
          actionBy: { username, full_name, email },
          caseId: newCase.id,
          fields: ['description', 'status', 'tags', 'title', 'connector', 'settings', OWNER_FIELD],
          newValue: JSON.stringify(query),
          owner: newCase.attributes.owner,
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
