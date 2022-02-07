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
  CasePostRequest,
  ActionTypes,
  CasePostRequestRt,
} from '../../../common/api';
import { MAX_TITLE_LENGTH } from '../../../common/constants';
import { isInvalidTag } from '../../../common/utils/validators';

import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { flattenCaseSavedObject, transformNewCase } from '../../common/utils';
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
    unsecuredSavedObjectsClient,
    caseService,
    userActionService,
    user,
    logger,
    authorization: auth,
  } = clientArgs;

  const query = pipe(
    excess(CasePostRequestRt).decode({
      ...data,
    }),
    fold(throwErrors(Boom.badRequest), identity)
  );

  if (query.title.length > MAX_TITLE_LENGTH) {
    throw Boom.badRequest(
      `The length of the title is too long. The maximum length is ${MAX_TITLE_LENGTH}.`
    );
  }

  if (query.tags.some(isInvalidTag)) {
    throw Boom.badRequest('A tag must contain at least one non-space character');
  }

  try {
    const savedObjectID = SavedObjectsUtils.generateId();

    await auth.ensureAuthorized({
      operation: Operations.createCase,
      entities: [{ owner: query.owner, id: savedObjectID }],
    });

    const newCase = await caseService.postNewCase({
      attributes: transformNewCase({
        user,
        newCase: query,
      }),
      id: savedObjectID,
    });

    await userActionService.createUserAction({
      type: ActionTypes.create_case,
      unsecuredSavedObjectsClient,
      caseId: newCase.id,
      user,
      payload: query,
      owner: newCase.attributes.owner,
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
