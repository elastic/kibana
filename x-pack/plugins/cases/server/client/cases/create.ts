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

import { SavedObjectsUtils } from '@kbn/core/server';

import type { CaseResponse, CasePostRequest } from '../../../common/api';
import {
  throwErrors,
  CaseResponseRt,
  ActionTypes,
  CasePostRequestRt,
  excess,
  CaseSeverity,
} from '../../../common/api';
import { MAX_ASSIGNEES_PER_CASE, MAX_TITLE_LENGTH } from '../../../common/constants';
import { isInvalidTag, areTotalAssigneesInvalid } from '../../../common/utils/validators';

import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { flattenCaseSavedObject, transformNewCase } from '../../common/utils';
import type { CasesClientArgs } from '..';
import { LICENSING_CASE_ASSIGNMENT_FEATURE } from '../../common/constants';

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
    services: { caseService, userActionService, licensingService, notificationService },
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

    /**
     * Assign users to a case is only available to Platinum+
     */

    if (query.assignees && query.assignees.length !== 0) {
      const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

      if (!hasPlatinumLicenseOrGreater) {
        throw Boom.forbidden(
          'In order to assign users to cases, you must be subscribed to an Elastic Platinum license'
        );
      }

      licensingService.notifyUsage(LICENSING_CASE_ASSIGNMENT_FEATURE);
    }

    if (areTotalAssigneesInvalid(query.assignees)) {
      throw Boom.badRequest(
        `You cannot assign more than ${MAX_ASSIGNEES_PER_CASE} assignees to a case.`
      );
    }

    const newCase = await caseService.postNewCase({
      attributes: transformNewCase({
        user,
        newCase: query,
      }),
      id: savedObjectID,
      refresh: false,
    });

    await userActionService.createUserAction({
      type: ActionTypes.create_case,
      caseId: newCase.id,
      user,
      payload: {
        ...query,
        severity: query.severity ?? CaseSeverity.LOW,
        assignees: query.assignees ?? [],
      },
      owner: newCase.attributes.owner,
    });

    const flattenedCase = flattenCaseSavedObject({
      savedObject: newCase,
    });

    if (query.assignees && query.assignees.length !== 0) {
      const assigneesWithoutCurrentUser = query.assignees.filter(
        (assignee) => assignee.uid !== user.profile_uid
      );

      await notificationService.notifyAssignees({
        assignees: assigneesWithoutCurrentUser,
        theCase: newCase,
      });
    }

    return CaseResponseRt.encode(flattenedCase);
  } catch (error) {
    throw createCaseError({ message: `Failed to create case: ${error}`, error, logger });
  }
};
