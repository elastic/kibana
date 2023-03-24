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
  CasesBulkGetResponseCertainFields,
  CasesBulkGetRequestCertainFields,
  CaseResponse,
  CaseAttributes,
} from '../../../common/api';
import {
  CasesBulkGetRequestRt,
  CasesResponseRt,
  excess,
  throwErrors,
  getTypeForCertainFieldsFromArray,
  CaseResponseRt,
} from '../../../common/api';
import { getTypeProps } from '../../../common/api/runtime_types';
import { createCaseError } from '../../common/error';
import { asArray, flattenCaseSavedObject } from '../../common/utils';
import type { CasesClientArgs, SOWithErrors } from '../types';
import { includeFieldsRequiredForAuthentication } from '../../authorization/utils';
import type { CaseSavedObject } from '../../common/types';
import { Operations } from '../../authorization';

type CaseSavedObjectWithErrors = SOWithErrors<CaseAttributes>;

/**
 * Retrieves multiple cases by ids.
 */
export const bulkGet = async <Field extends keyof CaseResponse = keyof CaseResponse>(
  params: CasesBulkGetRequestCertainFields<Field>,
  clientArgs: CasesClientArgs
): Promise<CasesBulkGetResponseCertainFields<Field>> => {
  const {
    services: { caseService, attachmentService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const fields = includeFieldsRequiredForAuthentication(asArray(params.fields));

    const request = pipe(
      excess(CasesBulkGetRequestRt).decode({ ...params, fields }),
      fold(throwErrors(Boom.badRequest), identity)
    );

    throwErrorIfCaseIdsReachTheLimit(request.ids);
    throwErrorIfFieldsAreInvalid(fields);

    const cases = await caseService.getCases({ caseIds: request.ids, fields });

    const [validCases, soBulkGetErrors] = partition(
      cases.saved_objects,
      (caseInfo) => caseInfo.error === undefined
    ) as [CaseSavedObject[], CaseSavedObjectWithErrors];

    const { authorized: authorizedCases, unauthorized: unauthorizedCases } =
      await authorization.getAndEnsureAuthorizedEntities({
        savedObjects: validCases,
        operation: Operations.bulkGetCases,
      });

    const requestForTotals = ['totalComment', 'totalAlerts'].some(
      (totalKey) => !fields || fields.includes(totalKey)
    );

    const commentTotals = requestForTotals
      ? await attachmentService.getter.getCaseCommentStats({
          caseIds: authorizedCases.map((theCase) => theCase.id),
        })
      : new Map();

    const flattenedCases = authorizedCases.map((theCase) => {
      const { alerts, userComments } = commentTotals.get(theCase.id) ?? {
        alerts: 0,
        userComments: 0,
      };

      const flattenedCase = flattenCaseSavedObject({
        savedObject: theCase,
        totalComment: userComments,
        totalAlerts: alerts,
      });

      if (!fields?.length) {
        return flattenedCase;
      }

      return pick(flattenedCase, [...fields, 'id', 'version']);
    });

    const typeToEncode = getTypeForCertainFieldsFromArray(CasesResponseRt, fields);
    const casesToReturn = typeToEncode.encode(flattenedCases);

    const errors = constructErrors(soBulkGetErrors, unauthorizedCases);

    return { cases: casesToReturn, errors };
  } catch (error) {
    const ids = params.ids ?? [];
    throw createCaseError({
      message: `Failed to bulk get cases: ${ids.join(', ')}: ${error}`,
      error,
      logger,
    });
  }
};

const throwErrorIfFieldsAreInvalid = (fields?: string[]) => {
  if (!fields || fields.length === 0) {
    return;
  }

  const typeProps = getTypeProps(CaseResponseRt) ?? {};
  const validFields = Object.keys(typeProps);

  for (const field of fields) {
    if (!validFields.includes(field)) {
      throw Boom.badRequest(`Field: ${field} is not supported`);
    }
  }
};

const throwErrorIfCaseIdsReachTheLimit = (ids: string[]) => {
  if (ids.length > MAX_BULK_GET_CASES) {
    throw Boom.badRequest(`Maximum request limit of ${MAX_BULK_GET_CASES} cases reached`);
  }
};

const constructErrors = (
  soBulkGetErrors: CaseSavedObjectWithErrors,
  unauthorizedCases: CaseSavedObject[]
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
