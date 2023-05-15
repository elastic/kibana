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
import { pick, partition } from 'lodash';

import { MAX_BULK_GET_CASES } from '../../../common/constants';
import type {
  CasesBulkGetResponse,
  CasesBulkGetRequest,
  CaseAttributes,
} from '../../../common/api';
import {
  CasesBulkGetRequestRt,
  CasesBulkGetResponseFieldsRt,
  excess,
  throwErrors,
  CasesBulkGetResponseRt,
} from '../../../common/api';
import { createCaseError } from '../../common/error';
import { flattenCaseSavedObject } from '../../common/utils';
import type { CasesClientArgs, SOWithErrors } from '../types';
import { Operations } from '../../authorization';
import type { CaseSavedObjectTransformed } from '../../common/types/case';

type CaseSavedObjectWithErrors = SOWithErrors<CaseAttributes>;
type BulkGetCase = CasesBulkGetResponse['cases'][number];

/**
 * Retrieves multiple cases by ids.
 */
export const bulkGet = async (
  params: CasesBulkGetRequest,
  clientArgs: CasesClientArgs
): Promise<CasesBulkGetResponse> => {
  const {
    services: { caseService, attachmentService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const fields = Object.keys(CasesBulkGetResponseFieldsRt.props).filter(
      (field) => !['totalComments', 'id', 'version'].includes(field)
    );

    const request = pipe(
      excess(CasesBulkGetRequestRt).decode(params),
      fold(throwErrors(Boom.badRequest), identity)
    );

    throwErrorIfCaseIdsReachTheLimit(request.ids);

    const cases = await caseService.getCases({ caseIds: request.ids, fields });

    const [validCases, soBulkGetErrors] = partition(
      cases.saved_objects,
      (caseInfo) => caseInfo.error === undefined
    ) as [CaseSavedObjectTransformed[], CaseSavedObjectWithErrors];

    const { authorized: authorizedCases, unauthorized: unauthorizedCases } =
      await authorization.getAndEnsureAuthorizedEntities({
        savedObjects: validCases,
        operation: Operations.bulkGetCases,
      });

    const commentTotals = await attachmentService.getter.getCaseCommentStats({
      caseIds: authorizedCases.map((theCase) => theCase.id),
    });

    const flattenedCases = authorizedCases.map((theCase) => {
      const { userComments } = commentTotals.get(theCase.id) ?? {
        alerts: 0,
        userComments: 0,
      };

      const flattenedCase = flattenCaseSavedObject({
        savedObject: theCase,
        totalComment: userComments,
      });

      return {
        ...(pick(flattenedCase, [...fields, 'id', 'version']) as BulkGetCase),
        totalComments: flattenedCase.totalComment,
      };
    });

    const errors = constructErrors(soBulkGetErrors, unauthorizedCases);

    return CasesBulkGetResponseRt.encode({ cases: flattenedCases, errors });
  } catch (error) {
    const ids = params.ids ?? [];
    throw createCaseError({
      message: `Failed to bulk get cases: ${ids.join(', ')}: ${error}`,
      error,
      logger,
    });
  }
};

const throwErrorIfCaseIdsReachTheLimit = (ids: string[]) => {
  if (ids.length > MAX_BULK_GET_CASES) {
    throw Boom.badRequest(`Maximum request limit of ${MAX_BULK_GET_CASES} cases reached`);
  }
};

const constructErrors = (
  soBulkGetErrors: CaseSavedObjectWithErrors,
  unauthorizedCases: CaseSavedObjectTransformed[]
): CasesBulkGetResponse['errors'] => {
  const errors: CasesBulkGetResponse['errors'] = [];

  for (const soError of soBulkGetErrors) {
    errors.push({
      error: soError.error.error,
      message: soError.error.message,
      status: soError.error.statusCode,
      caseId: soError.id,
    });
  }

  for (const theCase of unauthorizedCases) {
    errors.push({
      error: 'Forbidden',
      message: `Unauthorized to access case with owner: "${theCase.attributes.owner}"`,
      status: 403,
      caseId: theCase.id,
    });
  }

  return errors;
};
