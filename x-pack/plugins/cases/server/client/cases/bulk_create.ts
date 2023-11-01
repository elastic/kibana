/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { partition } from 'lodash';

import { SavedObjectsUtils } from '@kbn/core/server';

import type { Case, CustomFieldsConfiguration } from '../../../common/types/domain';
import { CaseSeverity, UserActionTypes } from '../../../common/types/domain';
import { decodeWithExcessOrThrow } from '../../../common/api';

import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { flattenCaseSavedObject, isSOError, transformNewCase } from '../../common/utils';
import type { CasesClient, CasesClientArgs } from '..';
import { LICENSING_CASE_ASSIGNMENT_FEATURE } from '../../common/constants';
import { decodeOrThrow } from '../../../common/api/runtime_types';
import type {
  BulkCreateCasesRequest,
  BulkCreateCasesResponse,
  CasePostRequest,
} from '../../../common/types/api';
import { BulkCreateCasesResponseRt, BulkCreateCasesRequestRt } from '../../../common/types/api';
import {} from '../utils';
import { validateCustomFields } from './validators';
import { fillMissingCustomFields } from './utils';
import type { BulkCreateCasesArgs } from '../../services/cases/types';
import type { NotifyAssigneesArgs } from '../../services/notifications/types';

/**
 * Bulk create new case.
 *
 */
export const bulkCreate = async (
  data: BulkCreateCasesRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<BulkCreateCasesResponse> => {
  const {
    services: { caseService, userActionService, licensingService, notificationService },
    user,
    logger,
    authorization: auth,
  } = clientArgs;

  try {
    const decodedData = decodeWithExcessOrThrow(BulkCreateCasesRequestRt)(data);
    const configurations = await casesClient.configure.get();

    const customFieldsConfigurationMap: Map<string, CustomFieldsConfiguration> = new Map(
      configurations.map((conf) => [conf.owner, conf.customFields])
    );

    const casesWithIds = decodedData.cases.map((theCase) => ({
      ...theCase,
      id: theCase.id ?? SavedObjectsUtils.generateId(),
    }));

    await auth.ensureAuthorized({
      operation: Operations.createCase,
      entities: casesWithIds.map((theCase) => ({ owner: theCase.owner, id: theCase.id })),
    });

    const bulkCreateRequest: BulkCreateCasesArgs['cases'] = [];

    for (const theCase of casesWithIds) {
      const customFieldsConfiguration = customFieldsConfigurationMap.get(theCase.owner);

      const customFieldsValidationParams = {
        requestCustomFields: theCase.customFields,
        customFieldsConfiguration,
      };

      validateCustomFields(customFieldsValidationParams);

      /**
       * Assign users to a case is only available to Platinum+
       */

      if (theCase.assignees && theCase.assignees.length !== 0) {
        const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

        if (!hasPlatinumLicenseOrGreater) {
          throw Boom.forbidden(
            'In order to assign users to cases, you must be subscribed to an Elastic Platinum license'
          );
        }

        licensingService.notifyUsage(LICENSING_CASE_ASSIGNMENT_FEATURE);
      }

      /**
       * Trim title, category, description and tags
       * and fill out missing custom fields
       * before saving to ES
       */

      const { id, ...caseWithoutId } = theCase;

      const normalizedQuery = {
        ...caseWithoutId,
        title: caseWithoutId.title.trim(),
        description: caseWithoutId.description.trim(),
        category: caseWithoutId.category?.trim() ?? null,
        tags: caseWithoutId.tags?.map((tag) => tag.trim()) ?? [],
        customFields: fillMissingCustomFields({
          customFields: caseWithoutId.customFields,
          customFieldsConfiguration,
        }),
      };

      bulkCreateRequest.push({
        id,
        ...transformNewCase({
          user,
          newCase: normalizedQuery,
        }),
      });
    }

    const bulkCreateResponse = await caseService.bulkCreateCases({
      cases: bulkCreateRequest,
      refresh: false,
    });

    const userActions = [];
    const assigneesPerCase: NotifyAssigneesArgs[] = [];
    const res: Case[] = [];

    const [errors, casesSOs] = partition(bulkCreateResponse.saved_objects, isSOError);

    if (errors.length > 0) {
      const firstError = errors[0];
      throw new Boom.Boom(firstError.error.error, {
        statusCode: firstError.error.statusCode,
        message: firstError.error.message,
      });
    }

    for (const theCase of casesSOs) {
      const payload: CasePostRequest = {
        title: theCase.attributes.title,
        tags: theCase.attributes.tags,
        connector: theCase.attributes.connector,
        settings: theCase.attributes.settings,
        owner: theCase.attributes.owner,
        description: theCase.attributes.description,
        severity: theCase.attributes.severity ?? CaseSeverity.LOW,
        assignees: theCase.attributes.assignees ?? [],
        category: theCase.attributes.category ?? null,
        customFields: theCase.attributes.customFields ?? [],
      };

      userActions.push({
        type: UserActionTypes.create_case,
        caseId: theCase.id,
        user,
        payload,
        owner: theCase.attributes.owner,
      });

      if (theCase.attributes.assignees && theCase.attributes.assignees.length !== 0) {
        const assigneesWithoutCurrentUser = theCase.attributes.assignees.filter(
          (assignee) => assignee.uid !== user.profile_uid
        );

        assigneesPerCase.push({ assignees: assigneesWithoutCurrentUser, theCase });
      }

      res.push(
        flattenCaseSavedObject({
          savedObject: theCase,
        })
      );
    }

    await userActionService.creator.bulkCreateUserAction({ userActions });

    if (assigneesPerCase.length > 0) {
      await notificationService.bulkNotifyAssignees(assigneesPerCase);
    }

    return decodeOrThrow(BulkCreateCasesResponseRt)({ cases: res });
  } catch (error) {
    throw createCaseError({ message: `Failed to bulk create cases: ${error}`, error, logger });
  }
};
