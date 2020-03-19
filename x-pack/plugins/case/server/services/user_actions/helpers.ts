/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsUpdateResponse } from 'kibana/server';
import { get } from 'lodash';

import {
  CaseUserActionAttributes,
  UserAction,
  UserActionField,
  CaseAttributes,
  User,
} from '../../../common/api';
import { isTwoArraysDifference } from '../../routes/api/cases/helpers';
import { UserActionItem } from '.';
import { CASE_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT } from '../../saved_object_types';

export const transformNewUserAction = ({
  actionField,
  action,
  actionAt,
  full_name,
  newValue = null,
  oldValue = null,
  username,
}: {
  actionField: UserActionField;
  action: UserAction;
  actionAt: string;
  full_name?: string;
  newValue?: string | null;
  oldValue?: string | null;
  username: string;
}): CaseUserActionAttributes => ({
  action_field: actionField,
  action,
  action_at: actionAt,
  action_by: { full_name, username },
  new_value: newValue,
  old_value: oldValue,
});

interface BuildCaseUserAction {
  action: UserAction;
  actionAt: string;
  actionBy: User;
  caseId: string;
  fields: UserActionField | unknown[];
  newValue?: string | unknown;
  oldValue?: string | unknown;
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
}: BuildCommentUserActionItem): UserActionItem => ({
  attributes: transformNewUserAction({
    actionField: fields as UserActionField,
    action,
    actionAt,
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
}: BuildCaseUserAction): UserActionItem => ({
  attributes: transformNewUserAction({
    actionField: fields as UserActionField,
    action,
    actionAt,
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
  ],
});

interface CompareArray {
  addedItems: string[];
  deletedItems: string[];
}
const compareArray = ({
  originalValue,
  updatedValue,
}: {
  originalValue: string[];
  updatedValue: string[];
}): CompareArray => {
  const result: CompareArray = {
    addedItems: [],
    deletedItems: [],
  };
  originalValue.forEach(origVal => {
    if (!updatedValue.includes(origVal)) {
      result.deletedItems = [...result.deletedItems, origVal];
    }
  });
  updatedValue.forEach(updatedVal => {
    if (!originalValue.includes(updatedVal)) {
      result.addedItems = [...result.addedItems, updatedVal];
    }
  });

  return result;
};

export const buildCaseUserActions = ({
  actionDate,
  actionBy,
  originalCases,
  updatedCases,
}: {
  actionDate: string;
  actionBy: User;
  originalCases: Array<SavedObject<CaseAttributes>>;
  updatedCases: Array<SavedObjectsUpdateResponse<CaseAttributes>>;
}): UserActionItem[] =>
  updatedCases.reduce<UserActionItem[]>((acc, updatedItem) => {
    const originalItem = originalCases.find(oItem => oItem.id === updatedItem.id);
    if (originalItem != null) {
      let userActions: UserActionItem[] = [];
      const updatedFields = Object.keys(updatedItem.attributes);
      updatedFields.forEach(field => {
        const origValue = get(originalItem, ['attributes', field]);
        const updatedValue = get(updatedItem, ['attributes', field]);
        if (isTwoArraysDifference(origValue, updatedValue)) {
          const arrayDiff = compareArray({
            originalValue: origValue as string[],
            updatedValue: updatedValue as string[],
          });
          if (arrayDiff.addedItems.length > 0) {
            userActions = [
              ...userActions,
              buildCaseUserActionItem({
                action: 'add',
                actionAt: actionDate,
                actionBy,
                caseId: updatedItem.id,
                fields: [field],
                newValue: arrayDiff.addedItems.join(', '),
              }),
            ];
          }
          if (arrayDiff.deletedItems.length > 0) {
            userActions = [
              ...userActions,
              buildCaseUserActionItem({
                action: 'delete',
                actionAt: actionDate,
                actionBy,
                caseId: updatedItem.id,
                fields: [field],
                newValue: arrayDiff.deletedItems.join(', '),
              }),
            ];
          }
        } else if (origValue !== updatedValue) {
          userActions = [
            ...userActions,
            buildCaseUserActionItem({
              action: 'update',
              actionAt: actionDate,
              actionBy,
              caseId: updatedItem.id,
              fields: [field],
              newValue: updatedValue,
              oldValue: origValue,
            }),
          ];
        }
      });
      return [...acc, ...userActions];
    }
    return acc;
  }, []);
