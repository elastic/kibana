/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsUpdateResponse } from 'kibana/server';
import { get, isPlainObject, isString } from 'lodash';
import deepEqual from 'fast-deep-equal';

import {
  CaseUserActionAttributes,
  UserAction,
  UserActionField,
  ESCaseAttributes,
  User,
} from '../../../common/api';
import {
  isTwoArraysDifference,
  transformESConnectorToCaseConnector,
} from '../../routes/api/cases/helpers';
import { UserActionItem } from '.';
import { CASE_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT } from '../../saved_object_types';

export const transformNewUserAction = ({
  actionField,
  action,
  actionAt,
  email,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  full_name,
  newValue = null,
  oldValue = null,
  username,
}: {
  actionField: UserActionField;
  action: UserAction;
  actionAt: string;
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

const userActionFieldsAllowed: UserActionField = [
  'comment',
  'connector',
  'description',
  'tags',
  'title',
  'status',
];

export const buildCaseUserActions = ({
  actionDate,
  actionBy,
  originalCases,
  updatedCases,
}: {
  actionDate: string;
  actionBy: User;
  originalCases: Array<SavedObject<ESCaseAttributes>>;
  updatedCases: Array<SavedObjectsUpdateResponse<ESCaseAttributes>>;
}): UserActionItem[] =>
  updatedCases.reduce<UserActionItem[]>((acc, updatedItem) => {
    const originalItem = originalCases.find((oItem) => oItem.id === updatedItem.id);
    if (originalItem != null) {
      let userActions: UserActionItem[] = [];
      const updatedFields = Object.keys(updatedItem.attributes) as UserActionField;
      updatedFields.forEach((field) => {
        if (userActionFieldsAllowed.includes(field)) {
          const origValue =
            field === 'connector' && originalItem.attributes.connector
              ? transformESConnectorToCaseConnector(originalItem.attributes.connector)
              : get(originalItem, ['attributes', field]);

          const updatedValue =
            field === 'connector' && updatedItem.attributes.connector
              ? transformESConnectorToCaseConnector(updatedItem.attributes.connector)
              : get(updatedItem, ['attributes', field]);

          if (isString(origValue) && isString(updatedValue) && origValue !== updatedValue) {
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
          } else if (Array.isArray(origValue) && Array.isArray(updatedValue)) {
            const compareValues = isTwoArraysDifference(origValue, updatedValue);
            if (compareValues && compareValues.addedItems.length > 0) {
              userActions = [
                ...userActions,
                buildCaseUserActionItem({
                  action: 'add',
                  actionAt: actionDate,
                  actionBy,
                  caseId: updatedItem.id,
                  fields: [field],
                  newValue: compareValues.addedItems.join(', '),
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
                  caseId: updatedItem.id,
                  fields: [field],
                  newValue: compareValues.deletedItems.join(', '),
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
                caseId: updatedItem.id,
                fields: [field],
                newValue: JSON.stringify(updatedValue),
                oldValue: JSON.stringify(origValue),
              }),
            ];
          }
        }
      });
      return [...acc, ...userActions];
    }
    return acc;
  }, []);
