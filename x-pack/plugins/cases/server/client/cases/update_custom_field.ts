/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { CasesClient, CasesClientArgs } from '..';

import type { CaseRequestCustomFields, CustomFieldPatchRequest } from '../../../common/types/api';
import { CustomFieldPatchRequestRt } from '../../../common/types/api';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { flattenCaseSavedObject } from '../../common/utils';
import { decodeOrThrow } from '../../../common/api/runtime_types';
import type { Cases } from '../../../common/types/domain';
import { decodeWithExcessOrThrow } from '../../../common/api';
import { CasesRt } from '../../../common/types/domain';
import {
  validateCustomFieldKeysAgainstConfiguration,
  validateCustomFieldTypesInRequest,
} from './validators';
import type { UserActionEvent } from '../../services/user_actions/types';

export interface UpdateCustomFieldArgs {
  /**
   * The ID of a case
   */
  caseId: string;
  /**
   * The ID of an custom field to be updated
   */
  customFieldId: string;
  /**
   * details of custom field to update
   */
  customFieldPatchDetails: CustomFieldPatchRequest;
}

/**
 * Updates the specified cases with new values
 *
 * @ignore
 */
export const updateCustomField = async (
  args: UpdateCustomFieldArgs,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<Cases> => {
  const {
    services: { caseService, userActionService },
    user,
    logger,
    authorization,
  } = clientArgs;

  try {
    const { customFieldPatchDetails, customFieldId, caseId } = args;
    const { customFieldDetails, version } =
      decodeWithExcessOrThrow(CustomFieldPatchRequestRt)(customFieldPatchDetails);
    const updatedAt = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { username, full_name, email, profile_uid } = user;

    const caseToUpdate = await caseService.getCase({
      id: caseId,
    });

    await authorization.ensureAuthorized({
      entities: [{ owner: caseToUpdate.attributes.owner, id: caseToUpdate.id }],
      operation: Operations.updateCase,
    });

    if (customFieldDetails.value == null) {
      throw Boom.badRequest('Custom field value cannot be null or undefined.');
    }

    const configurations = await casesClient.configure.get({
      owner: caseToUpdate.attributes.owner,
    });

    const customField: CaseRequestCustomFields = [{ key: customFieldId, ...customFieldDetails }];

    const customFieldIndex = caseToUpdate.attributes.customFields.findIndex(
      (cf) => cf.key === customFieldId
    );

    validateCustomFieldKeysAgainstConfiguration({
      requestCustomFields: customField,
      customFieldsConfiguration: configurations[0].customFields,
    });

    validateCustomFieldTypesInRequest({
      requestCustomFields: customField,
      customFieldsConfiguration: configurations[0].customFields,
    });

    const customFieldsToUpdate = [
      ...caseToUpdate.attributes.customFields.slice(0, customFieldIndex),
      ...customField,
      ...caseToUpdate.attributes.customFields.slice(customFieldIndex + 1),
    ];

    const patchCasesPayload = {
      caseId,
      originalCase: caseToUpdate,
      updatedAttributes: {
        customFields: customFieldsToUpdate,
        updated_at: updatedAt,
        updated_by: { username, full_name, email, profile_uid },
      },
      version,
    };

    const updatedCase = await caseService.patchCase({
      ...patchCasesPayload,
      refresh: false,
    });

    const userActionsDict = userActionService.creator.buildUserActions({
      updatedCases: {
        cases: [patchCasesPayload],
      },
      user,
    });

    const returnUpdatedCase = flattenCaseSavedObject({
      savedObject: {
        ...caseToUpdate,
        ...updatedCase,
        attributes: { ...caseToUpdate.attributes, ...updatedCase?.attributes },
        references: updatedCase.references ?? caseToUpdate.references,
        version: updatedCase?.version ?? caseToUpdate.version,
      },
    });

    const builtUserActions =
      userActionsDict != null
        ? Object.keys(userActionsDict).reduce<UserActionEvent[]>((acc, key) => {
            return [...acc, ...userActionsDict[key]];
          }, [])
        : [];

    await userActionService.creator.bulkCreateUpdateCase({
      builtUserActions,
    });

    return decodeOrThrow(CasesRt)([returnUpdatedCase]);
  } catch (error) {
    throw createCaseError({
      message: `Failed to update customField, id: ${args.customFieldId} of case: ${args.caseId} version:${args.customFieldPatchDetails.version} : ${error}`,
      error,
      logger,
    });
  }
};
