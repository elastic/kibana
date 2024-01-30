/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { SavedObjectsUtils } from '@kbn/core/server';

import type { Case } from '../../../common/types/domain';
import { CaseSeverity, UserActionTypes, CaseRt } from '../../../common/types/domain';
import { decodeWithExcessOrThrow } from '../../../common/api';

import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { flattenCaseSavedObject, transformNewCase } from '../../common/utils';
import type { CasesClient, CasesClientArgs } from '..';
import { LICENSING_CASE_ASSIGNMENT_FEATURE } from '../../common/constants';
import { decodeOrThrow } from '../../../common/api/runtime_types';
import type { CasePostRequest } from '../../../common/types/api';
import { CasePostRequestRt } from '../../../common/types/api';
import {} from '../utils';
import { validateCustomFields } from './validators';
import { normalizeCreateCaseRequest } from './utils';

/**
 * Creates a new case.
 *
 */
export const create = async (
  data: CasePostRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<Case> => {
  const {
    services: { caseService, userActionService, licensingService, notificationService },
    user,
    logger,
    authorization: auth,
  } = clientArgs;

  try {
    const query = decodeWithExcessOrThrow(CasePostRequestRt)(data);
    const configurations = await casesClient.configure.get({ owner: data.owner });
    const customFieldsConfiguration = configurations[0]?.customFields;

    const customFieldsValidationParams = {
      requestCustomFields: data.customFields,
      customFieldsConfiguration,
    };

    validateCustomFields(customFieldsValidationParams);

    const savedObjectID = SavedObjectsUtils.generateId();

    await auth.ensureAuthorized({
      operation: Operations.createCase,
      entities: [{ owner: query.owner, id: savedObjectID }],
    });

    /**
     * Assign users to a case is only available to Platinum+
     */

    if (query.assignees && query.assignees.length !== 0) {
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

    const normalizedCase = normalizeCreateCaseRequest(query, customFieldsConfiguration);

    const newCase = await caseService.createCase({
      attributes: transformNewCase({
        user,
        newCase: normalizedCase,
      }),
      id: savedObjectID,
      refresh: false,
    });

    await userActionService.creator.createUserAction({
      userAction: {
        type: UserActionTypes.create_case,
        caseId: newCase.id,
        user,
        payload: {
          ...query,
          severity: query.severity ?? CaseSeverity.LOW,
          assignees: query.assignees ?? [],
          category: query.category ?? null,
          customFields: query.customFields ?? [],
        },
        owner: newCase.attributes.owner,
      },
    });

    if (query.assignees && query.assignees.length !== 0) {
      const assigneesWithoutCurrentUser = query.assignees.filter(
        (assignee) => assignee.uid !== user.profile_uid
      );

      await notificationService.notifyAssignees({
        assignees: assigneesWithoutCurrentUser,
        theCase: newCase,
      });
    }

    const res = flattenCaseSavedObject({
      savedObject: newCase,
    });

    return decodeOrThrow(CaseRt)(res);
  } catch (error) {
    throw createCaseError({ message: `Failed to create case: ${error}`, error, logger });
  }
};
