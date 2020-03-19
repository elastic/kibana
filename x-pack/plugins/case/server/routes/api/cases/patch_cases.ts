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
        const query = pipe(
          CasesPatchRequestRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );
        const myCases = await caseService.getCases({
          client: context.core.savedObjects.client,
          caseIds: query.cases.map(q => q.id),
        });
        let nonExistingCases: CasePatchRequest[] = [];
        const conflictedCases = query.cases.filter(q => {
          const myCase = myCases.saved_objects.find(c => c.id === q.id);

          if (myCase && myCase.error) {
            nonExistingCases = [...nonExistingCases, q];
            return false;
          }
          return myCase == null || myCase?.version !== q.version;
        });
        if (nonExistingCases.length > 0) {
          throw Boom.notFound(
            `These cases ${nonExistingCases
              .map(c => c.id)
              .join(', ')} do not exist. Please check you have the correct ids.`
          );
        }
        if (conflictedCases.length > 0) {
          throw Boom.conflict(
            `These cases ${conflictedCases
              .map(c => c.id)
              .join(', ')} has been updated. Please refresh before saving additional updates.`
          );
        }
        const updateCases: CasePatchRequest[] = query.cases.map(thisCase => {
          const currentCase = myCases.saved_objects.find(c => c.id === thisCase.id);
          return currentCase != null
            ? getCaseToUpdate(currentCase.attributes, thisCase)
            : { id: thisCase.id, version: thisCase.version };
        });
        const updateFilterCases = updateCases.filter(updateCase => {
          const { id, version, ...updateCaseAttributes } = updateCase;
          return Object.keys(updateCaseAttributes).length > 0;
        });
        if (updateFilterCases.length > 0) {
          const updatedBy = await caseService.getUser({ request, response });
          const { email, full_name, username } = updatedBy;
          const updatedDt = new Date().toISOString();
          const updatedCases = await caseService.patchCases({
            client: context.core.savedObjects.client,
            cases: updateFilterCases.map(thisCase => {
              const { id: caseId, version, ...updateCaseAttributes } = thisCase;
              let closedInfo = {};
              if (updateCaseAttributes.status && updateCaseAttributes.status === 'closed') {
                closedInfo = {
                  closed_at: updatedDt,
                  closed_by: { email, full_name, username },
                };
              } else if (updateCaseAttributes.status && updateCaseAttributes.status === 'open') {
                closedInfo = {
                  closed_at: null,
                  closed_by: null,
                };
              }
              return {
                caseId,
                updatedAttributes: {
                  ...updateCaseAttributes,
                  ...closedInfo,
                  updated_at: updatedDt,
                  updated_by: { email, full_name, username },
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
