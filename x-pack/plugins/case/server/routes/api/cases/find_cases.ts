/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { isEmpty } from 'lodash';
import { CasesFindResponseRt, CasesFindRequestRt, throwErrors } from '../../../../common/api';
import { transformCases, sortToSnake, wrapError, escapeHatch } from '../utils';
import { RouteDeps, ExtraCaseData, ExtraDataFindByCases } from '../types';
import { CASE_SAVED_OBJECT } from '../../../saved_object_types';
import { CASES_URL } from '../../../../common/constants';

const combineFilters = (filters: string[], operator: 'OR' | 'AND'): string =>
  filters?.filter(i => i !== '').join(` ${operator} `);

const getStatusFilter = (status: 'open' | 'closed', appendFilter?: string) =>
  `${CASE_SAVED_OBJECT}.attributes.status: ${status}${
    !isEmpty(appendFilter) ? ` AND ${appendFilter}` : ''
  }`;

const buildFilter = (
  filters: string | string[] | undefined,
  field: string,
  operator: 'OR' | 'AND'
): string =>
  filters != null && filters.length > 0
    ? Array.isArray(filters)
      ? // Be aware of the surrounding parenthesis (as string inside literal) around filters.
        `(${filters
          .map(filter => `${CASE_SAVED_OBJECT}.attributes.${field}: ${filter}`)
          ?.join(` ${operator} `)})`
      : `${CASE_SAVED_OBJECT}.attributes.${field}: ${filters}`
    : '';

export function initFindCasesApi({ caseService, caseConfigureService, router }: RouteDeps) {
  router.get(
    {
      path: `${CASES_URL}/_find`,
      validate: {
        query: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        const queryParams = pipe(
          CasesFindRequestRt.decode(request.query),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const { tags, reporters, status, ...query } = queryParams;
        const tagsFilter = buildFilter(tags, 'tags', 'OR');
        const reportersFilters = buildFilter(reporters, 'created_by.username', 'OR');

        const myFilters = combineFilters([tagsFilter, reportersFilters], 'AND');
        const filter = status != null ? getStatusFilter(status, myFilters) : myFilters;

        const args = queryParams
          ? {
              client,
              options: {
                ...query,
                filter,
                sortField: sortToSnake(query.sortField ?? ''),
              },
            }
          : {
              client,
            };

        const argsOpenCases = {
          client,
          options: {
            fields: [],
            page: 1,
            perPage: 1,
            filter: getStatusFilter('open', myFilters),
          },
        };

        const argsClosedCases = {
          client,
          options: {
            fields: [],
            page: 1,
            perPage: 1,
            filter: getStatusFilter('closed', myFilters),
          },
        };
        const [cases, openCases, closesCases] = await Promise.all([
          caseService.findCases(args),
          caseService.findCases(argsOpenCases),
          caseService.findCases(argsClosedCases),
        ]);
        const extraDataFindByCases: ExtraDataFindByCases[] = await Promise.all(
          cases.saved_objects.map(async c => {
            let connectorId;
            let caseVersion;
            if (!('connector_id' in c.attributes)) {
              const myCaseConfigure = await caseConfigureService.find({ client });
              connectorId =
                myCaseConfigure.saved_objects.length > 0
                  ? myCaseConfigure.saved_objects[0].attributes.connector_id
                  : null;

              const patchCaseResp = await caseService.patchCase({
                client,
                caseId: c.id,
                version: c.version,
                updatedAttributes: { connector_id: connectorId },
              });
              caseVersion = patchCaseResp.version ?? '';
            } else {
              connectorId = c.attributes.connector_id;
              caseVersion = c.version ?? '';
            }

            const allCaseComments = await caseService.getAllCaseComments({
              client,
              caseId: c.id,
              options: {
                fields: [],
                page: 1,
                perPage: 1,
              },
            });
            return {
              ...allCaseComments,
              connectorId,
              caseVersion,
              cId: c.id,
            };
          })
        );
        const extraCaseData = extraDataFindByCases.reduce((acc: ExtraCaseData[], itemFind) => {
          if (itemFind.saved_objects.length > 0) {
            const caseId =
              itemFind.saved_objects[0].references.find(r => r.type === CASE_SAVED_OBJECT)?.id ??
              null;
            if (caseId != null) {
              return [
                ...acc,
                {
                  caseId,
                  totalComment: itemFind.total,
                  connectorId: itemFind.connectorId,
                  caseVersion: itemFind.caseVersion,
                },
              ];
            }
          }
          return [
            ...acc,
            {
              caseId: itemFind.cId,
              totalComment: 0,
              connectorId: itemFind.connectorId,
              caseVersion: itemFind.caseVersion,
            },
          ];
        }, []);
        return response.ok({
          body: CasesFindResponseRt.encode(
            transformCases(cases, openCases.total ?? 0, closesCases.total ?? 0, extraCaseData)
          ),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
