/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { CasesClient, CasesClientArgs } from '..';

import type {
  CaseRequestCustomField,
  CaseRequestCustomFields,
  CustomFieldPatchRequest,
} from '../../../common/types/api';
import { CustomFieldsRt } from '../../../common/types/api';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { flattenCaseSavedObject } from '../../common/utils';
import { decodeOrThrow } from '../../../common/api/runtime_types';
import type { Case } from '../../../common/types/domain';
import { CaseRt } from '../../../common/types/domain';
import { decodeWithExcessOrThrow } from '../../../common/api';
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
   * The ID of a custom field to be updated
   */
  customFieldId: string;
  /**
   * value of custom field to update, case version
   */
  request: CustomFieldPatchRequest;
}

/**
 * Updates the specified cases with new values
 *
 * @ignore
 */
export const updateCustomField = async (
  { caseId, customFieldId, request }: UpdateCustomFieldArgs,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<Case> => {
  const {
    services: { caseService, userActionService },
    user,
    logger,
    authorization,
  } = clientArgs;

  try {
    const { value, caseVersion } = request;

    const caseToUpdate = await caseService.getCase({
      id: caseId,
    });

    const configurations = await casesClient.configure.get({
      owner: caseToUpdate.attributes.owner,
    });

    await authorization.ensureAuthorized({
      entities: [{ owner: caseToUpdate.attributes.owner, id: caseToUpdate.id }],
      operation: Operations.updateCase,
    });

    const foundCustomField = configurations[0]?.customFields.find(
      (item) => item.key === customFieldId
    );

    if (!foundCustomField) {
      throw Boom.badRequest('cannot find custom field');
    }

    const decodedCustomFields = decodeWithExcessOrThrow(CustomFieldsRt)([
      {
        value,
        type: foundCustomField.type,
        key: customFieldId,
      },
      ...caseToUpdate.attributes.customFields.filter((field) => field.key !== customFieldId),
    ]);

    const updatedAt = new Date().toISOString();

    if (value == null && foundCustomField.required) {
      throw Boom.badRequest('Custom field value cannot be null or undefined.');
    }

    validateCustomFieldKeysAgainstConfiguration({
      requestCustomFields: decodedCustomFields,
      customFieldsConfiguration: configurations[0].customFields,
    });

    validateCustomFieldTypesInRequest({
      requestCustomFields: decodedCustomFields,
      customFieldsConfiguration: configurations[0].customFields,
    });

    const customFieldsToUpdate: CaseRequestCustomFields = caseToUpdate.attributes.customFields.map(
      (cf) => {
        if (cf.key === customFieldId) {
          return {
            value,
            type: foundCustomField.type,
            key: customFieldId,
          } as CaseRequestCustomField;
        }
        return cf;
      }
    );

    const patchCasesPayload = {
      caseId,
      originalCase: caseToUpdate,
      updatedAttributes: {
        customFields: customFieldsToUpdate,
        updated_at: updatedAt,
        updated_by: user,
      },
      version: caseVersion,
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

    return decodeOrThrow(CaseRt)(returnUpdatedCase);
  } catch (error) {
    throw createCaseError({
      message: `Failed to update customField, id: ${customFieldId} of case: ${caseId} version:${request.caseVersion} : ${error}`,
      error,
      logger,
    });
  }
};
