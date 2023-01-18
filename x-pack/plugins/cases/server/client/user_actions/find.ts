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

import type { UserActionFindResponse } from '../../../common/api';
import {
  UserActionFindRequestRt,
  throwErrors,
  excess,
  UserActionFindResponseRt,
} from '../../../common/api';
import type { CasesClientArgs } from '../types';
import type { UserActionFind } from './types';
import { Operations } from '../../authorization';
import { formatSavedObjects } from './utils';
import { createCaseError } from '../../common/error';
import { asArray } from '../../common/utils';

export const find = async (
  { caseId, params }: UserActionFind,
  clientArgs: CasesClientArgs
): Promise<UserActionFindResponse> => {
  const {
    services: { userActionService },
    logger,
    authorization,
  } = clientArgs;

  try {
    // supertest and query-string encode a single entry in an array as just a string so make sure we have an array
    const types = asArray(params.types);

    const queryParams = pipe(
      excess(UserActionFindRequestRt).decode({ ...params, types }),
      fold(throwErrors(Boom.badRequest), identity)
    );

    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.findUserActions);

    const userActions = await userActionService.finder.find({
      caseId,
      ...queryParams,
      filter: authorizationFilter,
    });

    ensureSavedObjectsAreAuthorized(
      userActions.saved_objects.map((so) => ({ owner: so.attributes.owner, id: so.id }))
    );

    return UserActionFindResponseRt.encode({
      userActions: formatSavedObjects(userActions),
      page: userActions.page,
      perPage: userActions.per_page,
      total: userActions.total,
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to find user actions for case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
