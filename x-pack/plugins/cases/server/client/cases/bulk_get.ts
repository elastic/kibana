/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';

import type { CaseAttributes } from '../../../common/types/domain';
import type { CasesBulkGetRequest, CasesBulkGetResponse } from '../../../common/types/api';
import { CasesBulkGetResponseRt, CasesBulkGetRequestRt } from '../../../common/types/api';
import { decodeWithExcessOrThrow } from '../../../common/api';
import { createCaseError } from '../../common/error';
import { flattenCaseSavedObject } from '../../common/utils';
import type { CasesClientArgs } from '../types';
import { Operations } from '../../authorization';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import type { SOWithErrors } from '../../common/types';
import { decodeOrThrow } from '../../../common/api/runtime_types';

type CaseSavedObjectWithErrors = Array<SOWithErrors<CaseAttributes>>;

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
    const request = decodeWithExcessOrThrow(CasesBulkGetRequestRt)(params);

    const cases = await caseService.getCases({ caseIds: request.ids });

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
      const { userComments, alerts } = commentTotals.get(theCase.id) ?? {
        alerts: 0,
        userComments: 0,
      };

      return flattenCaseSavedObject({
        savedObject: theCase,
        totalComment: userComments,
        totalAlerts: alerts,
      });
    });

    const errors = constructErrors(soBulkGetErrors, unauthorizedCases);
    const res = { cases: flattenedCases, errors };

    return decodeOrThrow(CasesBulkGetResponseRt)(res);
  } catch (error) {
    const ids = params.ids ?? [];
    throw createCaseError({
      message: `Failed to bulk get cases: ${ids.join(', ')}: ${error}`,
      error,
      logger,
    });
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
