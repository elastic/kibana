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

import type { CasesBulkGetRequest, CaseResponse } from '../../../common/api';
import { CasesBulkGetRequestRt, CasesResponseRt, excess, throwErrors } from '../../../common/api';
import { createCaseError } from '../../common/error';
import { asArray, flattenCaseSavedObject } from '../../common/utils';
import { Operations } from '../../authorization';
import type { CasesClientArgs } from '../types';

/**
 * Retrieves multiple cases by ids.
 *
 * @ignore
 */
export const bulkGet = async (
  params: CasesBulkGetRequest,
  clientArgs: CasesClientArgs
): Promise<CaseResponse[]> => {
  const {
    services: { caseService, attachmentService },
    logger,
    authorization,
    unsecuredSavedObjectsClient,
  } = clientArgs;

  try {
    const fields = asArray(params.fields);

    const request = pipe(
      excess(CasesBulkGetRequestRt).decode({ ...params, fields }),
      fold(throwErrors(Boom.badRequest), identity)
    );

    const cases = await caseService.getCases({ caseIds: request.ids, fields });

    const validCases = cases.saved_objects.filter((caseInfo) => caseInfo.error === undefined);

    await authorization.ensureAuthorized({
      operation: Operations.bulkGetCases,
      entities: validCases.map((theCase) => ({ id: theCase.id, owner: theCase.attributes.owner })),
    });

    const commentTotals = await attachmentService.getCaseCommentStats({
      unsecuredSavedObjectsClient,
      caseIds: validCases.map((theCase) => theCase.id),
    });

    const flattenedCases = validCases.map((theCase) => {
      const { alerts, userComments } = commentTotals.get(theCase.id) ?? {
        alerts: 0,
        userComments: 0,
      };

      return flattenCaseSavedObject({
        savedObject: theCase,
        totalComment: userComments,
        totalAlerts: alerts,
      });
    });

    return CasesResponseRt.encode(flattenedCases);
  } catch (error) {
    throw createCaseError({
      message: `Failed to bulk get cases: ${params.ids.join(', ')}: ${error}`,
      error,
      logger,
    });
  }
};
