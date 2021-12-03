/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectReference, SavedObjectsUpdateResponse } from 'kibana/server';
import { get, isPlainObject, isString } from 'lodash';
import deepEqual from 'fast-deep-equal';

import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CaseUserActionAttributes,
  OWNER_FIELD,
  SUB_CASE_SAVED_OBJECT,
  SubCaseAttributes,
  User,
  UserAction,
  UserActionField,
  CaseAttributes,
} from '../../../common';
import { isTwoArraysDifference } from '../../client/utils';
import { UserActionItem } from '.';
import { extractConnectorId } from './transform';
import { UserActionFieldType } from './types';
import { CASE_REF_NAME, COMMENT_REF_NAME, SUB_CASE_REF_NAME } from '../../common';

interface BuildCaseUserActionParams {
  action: UserAction;
  createdAt: string;
  createdBy: User;
  caseId: string;
  owner: string;
  fields: UserActionField;
  payload?: Record<string, unknown>;
  subCaseId?: string;
}

export const buildCaseUserActionItem = ({
  action,
  createdAt,
  createdBy,
  caseId,
  fields,
  subCaseId,
  owner,
  payload = {},
}: BuildCaseUserActionParams): UserActionItem => {
  const { transformedActionDetails: transformedPayload, references: newValueReferences } =
    extractConnectorId({
      action,
      actionFields: fields,
      actionDetails: payload,
      fieldType: UserActionFieldType.New,
    });

  return {
    attributes: transformNewUserAction({
      fields,
      action,
      createdAt,
      owner,
      createdBy,
      payload: transformedPayload,
    }),
    references: [...createCaseReferences(caseId, subCaseId), ...newValueReferences],
  };
};

const transformNewUserAction = ({
  action,
  createdAt,
  createdBy,
  fields,
  owner,
  payload,
}: BuildCaseUserActionParams): CaseUserActionAttributes => ({
  fields,
  action,
  created_at: createdAt,
  created_by: createdBy,
  payload,
  owner,
});

const createCaseReferences = (caseId: string, subCaseId?: string): SavedObjectReference[] => [
  {
    type: CASE_SAVED_OBJECT,
    name: CASE_REF_NAME,
    id: caseId,
  },
  ...(subCaseId
    ? [
        {
          type: SUB_CASE_SAVED_OBJECT,
          name: SUB_CASE_REF_NAME,
          id: subCaseId,
        },
      ]
    : []),
];

interface BuildCommentUserActionItem extends BuildCaseUserActionParams {
  commentId: string;
}

export const buildCommentUserActionItem = (params: BuildCommentUserActionItem): UserActionItem => {
  const { commentId } = params;
  const { attributes, references } = buildCaseUserActionItem(params);

  return {
    attributes,
    references: [
      ...references,
      {
        type: CASE_COMMENT_SAVED_OBJECT,
        name: COMMENT_REF_NAME,
        id: commentId,
      },
    ],
  };
};

const userActionFieldsAllowed: UserActionField = [
  'comment',
  'connector',
  'description',
  'tags',
  'title',
  'status',
  'settings',
  'sub_case',
  OWNER_FIELD,
];

interface CaseSubIDs {
  caseId: string;
  subCaseId?: string;
}

type GetCaseAndSubID = <T>(so: SavedObjectsUpdateResponse<T>) => CaseSubIDs;

/**
 * Abstraction functions to retrieve a given field and the caseId and subCaseId depending on
 * whether we're interacting with a case or a sub case.
 */
interface Getters {
  getCaseAndSubID: GetCaseAndSubID;
}

interface OwnerEntity {
  owner: string;
}

/**
 * The entity associated with the user action must contain an owner field
 */
const buildGenericCaseUserActions = <T extends OwnerEntity>({
  createdAt,
  createdBy,
  originalCases,
  updatedCases,
  allowedFields,
  getters,
}: {
  createdAt: string;
  createdBy: User;
  originalCases: Array<SavedObject<T>>;
  updatedCases: Array<SavedObjectsUpdateResponse<T>>;
  allowedFields: UserActionField;
  getters: Getters;
}): UserActionItem[] => {
  const { getCaseAndSubID } = getters;
  return updatedCases.reduce<UserActionItem[]>((acc, updatedItem) => {
    const { caseId, subCaseId } = getCaseAndSubID(updatedItem);
    // regardless of whether we're looking at a sub case or case, the id field will always be used to match between
    // the original and the updated saved object
    const originalItem = originalCases.find((oItem) => oItem.id === updatedItem.id);
    if (originalItem != null) {
      let userActions: UserActionItem[] = [];
      const updatedFields = Object.keys(updatedItem.attributes) as UserActionField;
      updatedFields.forEach((field) => {
        if (allowedFields.includes(field)) {
          const origValue = get(originalItem, ['attributes', field]);
          const updatedValue = get(updatedItem, ['attributes', field]);

          if (isString(origValue) && isString(updatedValue) && origValue !== updatedValue) {
            userActions = [
              ...userActions,
              buildCaseUserActionItem({
                action: 'update',
                createdAt,
                createdBy,
                caseId,
                subCaseId,
                fields: [field],
                payload: { [field]: updatedValue },
                owner: originalItem.attributes.owner,
              }),
            ];
          } else if (Array.isArray(origValue) && Array.isArray(updatedValue)) {
            const compareValues = isTwoArraysDifference(origValue, updatedValue);
            if (compareValues && compareValues.addedItems.length > 0) {
              userActions = [
                ...userActions,
                buildCaseUserActionItem({
                  action: 'add',
                  createdAt,
                  createdBy,
                  caseId,
                  subCaseId,
                  fields: [field],
                  payload: { [field]: compareValues.addedItems },
                  owner: originalItem.attributes.owner,
                }),
              ];
            }

            if (compareValues && compareValues.deletedItems.length > 0) {
              userActions = [
                ...userActions,
                buildCaseUserActionItem({
                  action: 'delete',
                  createdAt,
                  createdBy,
                  caseId,
                  subCaseId,
                  fields: [field],
                  payload: { [field]: compareValues.deletedItems },
                  owner: originalItem.attributes.owner,
                }),
              ];
            }
          } else if (
            isPlainObject(origValue) &&
            isPlainObject(updatedValue) &&
            !deepEqual(origValue, updatedValue)
          ) {
            userActions = [
              ...userActions,
              buildCaseUserActionItem({
                action: 'update',
                createdAt,
                createdBy,
                caseId,
                subCaseId,
                fields: [field],
                payload: { [field]: updatedValue },
                owner: originalItem.attributes.owner,
              }),
            ];
          }
        }
      });
      return [...acc, ...userActions];
    }
    return acc;
  }, []);
};

/**
 * Create a user action for an updated sub case.
 */
export const buildSubCaseUserActions = (args: {
  createdAt: string;
  createdBy: User;
  originalSubCases: Array<SavedObject<SubCaseAttributes>>;
  updatedSubCases: Array<SavedObjectsUpdateResponse<SubCaseAttributes>>;
}): UserActionItem[] => {
  const getCaseAndSubID = (so: SavedObjectsUpdateResponse<SubCaseAttributes>): CaseSubIDs => {
    const caseId = so.references?.find((ref) => ref.type === CASE_SAVED_OBJECT)?.id ?? '';
    return { caseId, subCaseId: so.id };
  };

  const getters: Getters = {
    getCaseAndSubID,
  };

  return buildGenericCaseUserActions({
    createdAt: args.createdAt,
    createdBy: args.createdBy,
    originalCases: args.originalSubCases,
    updatedCases: args.updatedSubCases,
    allowedFields: ['status'],
    getters,
  });
};

/**
 * Create a user action for an updated case.
 */
export const buildCaseUserActions = (args: {
  createdAt: string;
  createdBy: User;
  originalCases: Array<SavedObject<CaseAttributes>>;
  updatedCases: Array<SavedObjectsUpdateResponse<CaseAttributes>>;
}): UserActionItem[] => {
  const caseGetIds: GetCaseAndSubID = <T>(so: SavedObjectsUpdateResponse<T>): CaseSubIDs => {
    return { caseId: so.id };
  };

  const getters: Getters = {
    getCaseAndSubID: caseGetIds,
  };

  return buildGenericCaseUserActions({ ...args, allowedFields: userActionFieldsAllowed, getters });
};
