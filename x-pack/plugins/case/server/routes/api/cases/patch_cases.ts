/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import {
  CasesPatchRequestRt,
  throwErrors,
  CasesResponseRt,
  CasePatchRequest,
} from '../../../../common/api';
import { escapeHatch, wrapError, flattenCaseSavedObject } from '../utils';
import { RouteDeps } from '../types';
import { getCaseToUpdate } from './helpers';

export function initPatchCasesApi({ caseService, router }: RouteDeps) {
  router.patch(
    {
      path: '/api/cases',
      validate: {
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const queries = pipe(
          CasesPatchRequestRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );
        const myCases = await caseService.getCases({
          client: context.core.savedObjects.client,
          caseIds: queries.map(q => q.id),
        });

        const conflictedCases = queries.filter(q => {
          const myCase = myCases.saved_objects.find(c => c.id === q.id);
          return myCase == null || myCase?.version !== q.version;
        });
        if (conflictedCases.length > 0) {
          throw Boom.conflict(
            `These cases ${conflictedCases
              .map(c => c.id)
              .join(', ')} has been updated. Please refresh before saving additional updates.`
          );
        }

        const updateCases: CasePatchRequest[] = queries.map(query => {
          const currentCase = myCases.saved_objects.find(c => c.id === query.id);
          return currentCase != null
            ? getCaseToUpdate(currentCase.attributes, query)
            : { id: query.id, version: query.version };
        });
        const updateFilterCases = updateCases.filter(updateCase => {
          const { id, version, ...updateCaseAttributes } = updateCase;
          return Object.keys(updateCaseAttributes).length > 0;
        });

        if (updateFilterCases.length > 0) {
          const updatedBy = await caseService.getUser({ request, response });
          const { full_name, username } = updatedBy;
          const updatedDt = new Date().toISOString();
          const updatedCases = await caseService.patchCases({
            client: context.core.savedObjects.client,
            cases: updateFilterCases.map(thisCase => {
              const { id: caseId, version, ...updateCaseAttributes } = thisCase;
              return {
                caseId,
                updatedAttributes: {
                  ...updateCaseAttributes,
                  updated_at: updatedDt,
                  updated_by: { full_name, username },
                },
                version,
              };
            }),
          });

          const returnUpdatedCase = myCases.saved_objects
            .filter(myCase =>
              updatedCases.saved_objects.some(updatedCase => updatedCase.id === myCase.id)
            )
            .map(myCase => {
              const updatedCase = updatedCases.saved_objects.find(c => c.id === myCase.id);
              return flattenCaseSavedObject({
                ...myCase,
                ...updatedCase,
                attributes: { ...myCase.attributes, ...updatedCase?.attributes },
                references: myCase.references,
              });
            });

          return response.ok({
            body: CasesResponseRt.encode(returnUpdatedCase),
          });
        }
        throw Boom.notAcceptable('All update fields are identical to current version.');
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
