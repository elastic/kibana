/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectsUpdateResponse } from 'kibana/server';
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

export const transformNewUserAction = ({
  actionField,
  action,
  actionAt,
  email,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  full_name,
  owner,
  newValue = null,
  oldValue = null,
  username,
}: {
  actionField: UserActionField;
  action: UserAction;
  actionAt: string;
  owner: string;
  email?: string | null;
  full_name?: string | null;
  newValue?: string | null;
  oldValue?: string | null;
  username?: string | null;
}): CaseUserActionAttributes => ({
  action_field: actionField,
  action,
  action_at: actionAt,
  action_by: { email, full_name, username },
  new_value: newValue,
  old_value: oldValue,
  owner,
});

interface BuildCaseUserAction {
  action: UserAction;
  actionAt: string;
  actionBy: User;
  caseId: string;
  owner: string;
  fields: UserActionField | unknown[];
  newValue?: string | unknown;
  oldValue?: string | unknown;
  subCaseId?: string;
}

interface BuildCommentUserActionItem extends BuildCaseUserAction {
  commentId: string;
}

export const buildCommentUserActionItem = ({
  action,
  actionAt,
  actionBy,
  caseId,
  commentId,
  fields,
  newValue,
  oldValue,
  subCaseId,
  owner,
}: BuildCommentUserActionItem): UserActionItem => ({
  attributes: transformNewUserAction({
    actionField: fields as UserActionField,
    action,
    actionAt,
    owner,
    ...actionBy,
    newValue: newValue as string,
    oldValue: oldValue as string,
  }),
  references: [
    {
      type: CASE_SAVED_OBJECT,
      name: `associated-${CASE_SAVED_OBJECT}`,
      id: caseId,
    },
    {
      type: CASE_COMMENT_SAVED_OBJECT,
      name: `associated-${CASE_COMMENT_SAVED_OBJECT}`,
      id: commentId,
    },
    ...(subCaseId
      ? [
          {
            type: SUB_CASE_SAVED_OBJECT,
            id: subCaseId,
            name: `associated-${SUB_CASE_SAVED_OBJECT}`,
          },
        ]
      : []),
  ],
});

export const buildCaseUserActionItem = ({
  action,
  actionAt,
  actionBy,
  caseId,
  fields,
  newValue,
  oldValue,
  subCaseId,
  owner,
}: BuildCaseUserAction): UserActionItem => ({
  attributes: transformNewUserAction({
    actionField: fields as UserActionField,
    action,
    actionAt,
    owner,
    ...actionBy,
    newValue: newValue as string,
    oldValue: oldValue as string,
  }),
  references: [
    {
      type: CASE_SAVED_OBJECT,
      name: `associated-${CASE_SAVED_OBJECT}`,
      id: caseId,
    },
    ...(subCaseId
      ? [
          {
            type: SUB_CASE_SAVED_OBJECT,
            name: `associated-${SUB_CASE_SAVED_OBJECT}`,
            id: subCaseId,
          },
        ]
      : []),
  ],
});

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
  actionDate,
  actionBy,
  originalCases,
  updatedCases,
  allowedFields,
  getters,
}: {
  actionDate: string;
  actionBy: User;
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
                actionAt: actionDate,
                actionBy,
                caseId,
                subCaseId,
                fields: [field],
                newValue: updatedValue,
                oldValue: origValue,
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
                  actionAt: actionDate,
                  actionBy,
                  caseId,
                  subCaseId,
                  fields: [field],
                  newValue: compareValues.addedItems.join(', '),
                  owner: originalItem.attributes.owner,
                }),
              ];
            }

            if (compareValues && compareValues.deletedItems.length > 0) {
              userActions = [
                ...userActions,
                buildCaseUserActionItem({
                  action: 'delete',
                  actionAt: actionDate,
                  actionBy,
                  caseId,
                  subCaseId,
                  fields: [field],
                  newValue: compareValues.deletedItems.join(', '),
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
                actionAt: actionDate,
                actionBy,
                caseId,
                subCaseId,
                fields: [field],
                newValue: JSON.stringify(updatedValue),
                oldValue: JSON.stringify(origValue),
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
  actionDate: string;
  actionBy: User;
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
    actionDate: args.actionDate,
    actionBy: args.actionBy,
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
  actionDate: string;
  actionBy: User;
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
