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
import { pick } from 'lodash';

import type { CasesBulkGetRequest, CaseResponse } from '../../../common/api';
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
import { Operations } from '../../authorization';
import type { CasesClientArgs } from '../types';
import { includeFieldsRequiredForAuthentication } from '../../authorization/utils';

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
    const fields = includeFieldsRequiredForAuthentication(asArray(params.fields));

    const request = pipe(
      excess(CasesBulkGetRequestRt).decode({ ...params, fields }),
      fold(throwErrors(Boom.badRequest), identity)
    );

    throwIfFieldsAreInvalid(fields);

    const finalFields = fields?.length ? [...fields, 'id', 'version'] : fields;
    const cases = await caseService.getCases({ caseIds: request.ids, fields: finalFields });
    const validCases = cases.saved_objects.filter((caseInfo) => caseInfo.error === undefined);

    await authorization.ensureAuthorized({
      operation: Operations.bulkGetCases,
      entities: validCases.map((theCase) => ({ id: theCase.id, owner: theCase.attributes.owner })),
    });

    const requestForTotals = ['totalComment', 'totalAlerts'].some((totalKey) =>
      fields?.includes(totalKey)
    );

    const commentTotals = requestForTotals
      ? await attachmentService.getCaseCommentStats({
          unsecuredSavedObjectsClient,
          caseIds: validCases.map((theCase) => theCase.id),
        })
      : new Map();

    const flattenedCases = validCases.map((theCase) => {
      const { alerts, userComments } = commentTotals.get(theCase.id) ?? {
        alerts: 0,
        userComments: 0,
      };

      const flattenedCase = flattenCaseSavedObject({
        savedObject: theCase,
        totalComment: userComments,
        totalAlerts: alerts,
      });

      if (!finalFields?.length) {
        return flattenedCase;
      }

      return pick(flattenedCase, finalFields);
    });

    const typeToEncode = getTypeForCertainFieldsFromArray(CasesResponseRt, fields);

    return typeToEncode.encode(flattenedCases);
  } catch (error) {
    throw createCaseError({
      message: `Failed to bulk get cases: ${params.ids.join(', ')}: ${error}`,
      error,
      logger,
    });
  }
};

const throwIfFieldsAreInvalid = (fields?: string[]) => {
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
