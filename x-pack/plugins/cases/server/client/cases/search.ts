/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isArray } from 'lodash';
import Boom from '@hapi/boom';

import type { CustomFieldsConfiguration } from '../../../common/types/domain';
import type { CasesSearchRequest, CasesFindResponse } from '../../../common/types/api';
import { CasesSearchRequestRt, CasesFindResponseRt } from '../../../common/types/api';
import { decodeWithExcessOrThrow, decodeOrThrow } from '../../common/runtime_types';

import { createCaseError } from '../../common/error';
import { asArray, transformCases } from '../../common/utils';
import { constructQueryOptions } from '../utils';
import { Operations } from '../../authorization';
import type { CasesClient, CasesClientArgs } from '..';
import { LICENSING_CASE_ASSIGNMENT_FEATURE } from '../../common/constants';
import type { CasesSearchParams } from '../types';
import { validateSearchCasesCustomFields } from './validators';
import type { SavedObjectFindOptionsKueryNode } from '../../common/types';

/**
 * Retrieves a case and optionally its comments.
 *
 * @ignore
 */
export const search = async (
  params: CasesSearchRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<CasesFindResponse> => {
  const {
    services: { caseService, licensingService },
    authorization,
    logger,
    savedObjectsSerializer,
    spaceId,
  } = clientArgs;

  try {
    const paramArgs = decodeWithExcessOrThrow(CasesSearchRequestRt)(params);
    const configArgs = paramArgs.owner ? { owner: paramArgs.owner } : {};
    const configurations = await casesClient.configure.get(configArgs);
    const customFieldsConfiguration: CustomFieldsConfiguration = configurations
      .map((config) => config.customFields)
      .flat();

    /**
     * Assign users to a case is only available to Platinum+
     */

    if (!isEmpty(paramArgs.assignees)) {
      const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

      if (!hasPlatinumLicenseOrGreater) {
        throw Boom.forbidden(
          'In order to filter cases by assignees, you must be subscribed to an Elastic Platinum license'
        );
      }

      licensingService.notifyUsage(LICENSING_CASE_ASSIGNMENT_FEATURE);
    }

    /**
     * Validate custom fields
     */
    if (paramArgs?.customFields && !isEmpty(paramArgs?.customFields)) {
      /**
       * throw error if params has customFields and no owner
       */

      const isValidArray =
        isArray(paramArgs.owner) &&
        (!paramArgs.owner.length || paramArgs.owner.length > 1 || isEmpty(paramArgs.owner[0]));

      if (!paramArgs.owner || isValidArray) {
        throw Boom.badRequest('Owner must be provided. Multiple owners are not supported.');
      }

      validateSearchCasesCustomFields({
        customFieldsConfiguration,
        customFields: paramArgs.customFields,
      });
    }

    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.findCases);

    const options: CasesSearchParams = {
      tags: paramArgs.tags,
      reporters: paramArgs.reporters,
      sortField: paramArgs.sortField,
      status: paramArgs.status,
      severity: paramArgs.severity,
      owner: paramArgs.owner,
      from: paramArgs.from,
      to: paramArgs.to,
      assignees: paramArgs.assignees,
      category: paramArgs.category,
      customFields: paramArgs.customFields,
    };

    const statusStatsOptions = constructQueryOptions({
      ...options,
      status: undefined,
      customFieldsConfiguration,
      authorizationFilter,
    });

    const caseQueryOptions = constructQueryOptions({
      ...options,
      customFieldsConfiguration,
      authorizationFilter,
      searchTerm: paramArgs.search,
      searchFields: asArray(paramArgs.searchFields),
      spaceId,
      savedObjectsSerializer,
    });

    const caseOptions: SavedObjectFindOptionsKueryNode = {
      ...paramArgs,
      ...caseQueryOptions,
      search: undefined,
      searchFields: undefined,
    };

    const [cases, statusStats] = await Promise.all([
      caseService.findCasesGroupedByID({
        caseOptions,
      }),
      caseService.getCaseStatusStats({
        searchOptions: statusStatsOptions,
      }),
    ]);

    ensureSavedObjectsAreAuthorized([...cases.casesMap.values()]);

    const res = transformCases({
      casesMap: cases.casesMap,
      page: cases.page,
      perPage: cases.perPage,
      total: cases.total,
      countOpenCases: statusStats.open,
      countInProgressCases: statusStats['in-progress'],
      countClosedCases: statusStats.closed,
    });

    return decodeOrThrow(CasesFindResponseRt)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to find cases: ${JSON.stringify(params)}: ${error}`,
      error,
      logger,
    });
  }
};
