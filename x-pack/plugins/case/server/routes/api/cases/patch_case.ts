/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { difference, get } from 'lodash';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import {
  CaseAttributes,
  CasePatchRequestRt,
  throwErrors,
  CaseResponseRt,
} from '../../../../common/api';
import { escapeHatch, wrapError, flattenCaseSavedObject } from '../utils';
import { RouteDeps } from '../types';

export function initPatchCaseApi({ caseService, router }: RouteDeps) {
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
          CasePatchRequestRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );
        const myCase = await caseService.getCase({
          client: context.core.savedObjects.client,
          caseId: query.id,
        });

        if (query.version !== myCase.version) {
          throw Boom.conflict(
            'This case has been updated. Please refresh before saving additional updates.'
          );
        }
        const currentCase: CaseAttributes = myCase.attributes;
        const updateCase: Partial<CaseAttributes> = Object.entries(query).reduce(
          (acc, [key, value]) => {
            const currentValue = get(currentCase, key);
            if (
              currentValue != null &&
              Array.isArray(value) &&
              Array.isArray(currentValue) &&
              difference(value, currentValue).length !== 0
            ) {
              return {
                ...acc,
                [key]: value,
              };
            } else if (currentValue != null && value !== currentValue) {
              return {
                ...acc,
                [key]: value,
              };
            }
            return acc;
          },
          {}
        );
        if (Object.keys(updateCase).length > 0) {
          const updatedBy = await caseService.getUser({ request, response });
          const { full_name, username } = updatedBy;
          const updatedCase = await caseService.patchCase({
            client: context.core.savedObjects.client,
            caseId: query.id,
            updatedAttributes: {
              ...updateCase,
              updated_at: new Date().toISOString(),
              updated_by: { full_name, username },
            },
          });
          return response.ok({
            body: CaseResponseRt.encode(
              flattenCaseSavedObject({
                ...updatedCase,
                attributes: { ...myCase.attributes, ...updatedCase.attributes },
                references: myCase.references,
              })
            ),
          });
        }
        throw Boom.notAcceptable('All update fields are identical to current version.');
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
