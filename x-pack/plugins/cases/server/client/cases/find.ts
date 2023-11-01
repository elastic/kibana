/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import Boom from '@hapi/boom';

import type { CustomFieldsConfiguration } from '../../../common/types/domain';
import type { CasesFindRequest, CasesFindResponse } from '../../../common/types/api';
import { CasesFindRequestRt, CasesFindResponseRt } from '../../../common/types/api';
import { decodeWithExcessOrThrow } from '../../../common/api';

import { createCaseError } from '../../common/error';
import { asArray, transformCases } from '../../common/utils';
import { constructQueryOptions, constructSearch } from '../utils';
import { Operations } from '../../authorization';
import type { CasesClient, CasesClientArgs } from '..';
import { LICENSING_CASE_ASSIGNMENT_FEATURE } from '../../common/constants';
import type { CasesFindQueryParams } from '../types';
import { decodeOrThrow } from '../../../common/api/runtime_types';
import { casesCustomFields } from '../../custom_fields';

/**
 * Retrieves a case and optionally its comments.
 *
 * @ignore
 */
export const find = async (
  params: CasesFindRequest,
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
    const paramArgs = decodeWithExcessOrThrow(CasesFindRequestRt)(params);
    const configArgs = paramArgs.owner ? { owner: paramArgs.owner } : {};
    const configurations = await casesClient.configure.get(configArgs);
    let customFieldsMapping = null;

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
     * Verify if custom field type is filterable
     */
    if (paramArgs?.customFields && !isEmpty(paramArgs?.customFields)) {
      let customFieldsConfiguration: CustomFieldsConfiguration = [];

      if (configurations.length) {
        customFieldsConfiguration = paramArgs.owner
          ? configurations[0].customFields
          : configurations.map((config) => config.customFields).flat();
      }

      Object.keys(paramArgs.customFields).forEach((customFieldKey) => {
        const customFieldConfig = customFieldsConfiguration.find(
          (item) => item.key === customFieldKey
        );

        if (customFieldConfig) {
          customFieldsMapping = casesCustomFields.get(customFieldConfig.type);

          // validateCustomFields(customFieldsMapping, customFieldConfig, paramArgs.customFields);

          if (!customFieldsMapping?.isFilterable) {
            throw Boom.forbidden(
              `Filtering by custom filed of type ${customFieldConfig.type} is not allowed.`
            );
          }
        }
      });
    }

    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.findCases);

    const options: CasesFindQueryParams = {
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
      authorizationFilter,
    });

    const caseQueryOptions = constructQueryOptions({ ...options, authorizationFilter });

    const caseSearch = constructSearch(paramArgs.search, spaceId, savedObjectsSerializer);

    const [cases, statusStats] = await Promise.all([
      caseService.findCasesGroupedByID({
        caseOptions: {
          ...paramArgs,
          ...caseQueryOptions,
          ...caseSearch,
          searchFields: asArray(paramArgs.searchFields),
        },
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
