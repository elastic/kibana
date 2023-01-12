/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import type {
  CaseUserActionAttributesWithoutConnectorId,
  CaseUserActionResponse,
  FindTypes,
  UserActionFindRequest,
  ActionTypeValues,
} from '../../../common/api';
import { ActionTypes, CommentType } from '../../../common/api';
import { CASE_SAVED_OBJECT, CASE_USER_ACTION_SAVED_OBJECT } from '../../../common/constants';

import type { ServiceContext } from './types';
import { transformFindResponseToExternalModel } from '.';
import { buildFilter, combineFilters } from '../../client/utils';

interface FindOptions extends UserActionFindRequest {
  caseId: string;
  filter?: KueryNode;
}

export class UserActionFinder {
  constructor(private readonly context: ServiceContext) {}

  public async find({
    caseId,
    action,
    sortOrder,
    type,
    searchAfter,
    perPage,
    filter,
  }: FindOptions): Promise<SavedObjectsFindResponse<CaseUserActionResponse>> {
    try {
      this.context.log.debug(`Attempting to find user actions for case id: ${caseId}`);

      const finalFilter = combineFilters([filter, UserActionFinder.buildFilter({ action, type })]);

      const userActions =
        await this.context.unsecuredSavedObjectsClient.find<CaseUserActionAttributesWithoutConnectorId>(
          {
            type: CASE_USER_ACTION_SAVED_OBJECT,
            hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
            perPage,
            sortField: 'created_at',
            sortOrder,
            searchAfter,
            filter: finalFilter,
          }
        );

      return transformFindResponseToExternalModel(
        userActions,
        this.context.persistableStateAttachmentTypeRegistry
      );
    } catch (error) {
      this.context.log.error(`Error finding user actions for case id: ${caseId}: ${error}`);
      throw error;
    }
  }

  private static buildFilter({
    action,
    type,
  }: {
    action: FindOptions['action'];
    type: FindOptions['type'];
  }) {
    const actionFilter = buildFilter({
      filters: [action],
      field: 'action',
      operator: 'or',
      type: CASE_USER_ACTION_SAVED_OBJECT,
    });

    let typeFilter: KueryNode | undefined;

    switch (type) {
      case 'action':
        typeFilter = UserActionFinder.buildActionFilter();
        break;
      case 'user':
      case 'alert':
        typeFilter = UserActionFinder.buildUserAndAlertFilter(type);
        break;
      case 'attachment':
        typeFilter = UserActionFinder.buildAttachmentsFilter();
        break;
      default:
        typeFilter = UserActionFinder.buildGenericTypeFilter(type);
        break;
    }

    return combineFilters([actionFilter, typeFilter]);
  }

  private static buildActionFilter(): KueryNode | undefined {
    const actionTypesExceptComment = Object.keys(ActionTypes).filter(
      (actionType) => actionType !== ActionTypes.comment
    );

    return buildFilter({
      filters: actionTypesExceptComment,
      field: 'type',
      operator: 'or',
      type: CASE_USER_ACTION_SAVED_OBJECT,
    });
  }

  private static buildUserAndAlertFilter(
    type: typeof FindTypes.alert | typeof FindTypes.user
  ): KueryNode | undefined {
    return combineFilters([
      buildFilter({
        filters: [ActionTypes.comment],
        field: 'type',
        operator: 'or',
        type: CASE_USER_ACTION_SAVED_OBJECT,
      }),
      buildFilter({
        filters: [type],
        field: 'payload.comment.type',
        operator: 'or',
        type: CASE_USER_ACTION_SAVED_OBJECT,
      }),
    ]);
  }

  private static buildAttachmentsFilter(): KueryNode | undefined {
    return combineFilters([
      buildFilter({
        filters: [ActionTypes.comment],
        field: 'type',
        operator: 'or',
        type: CASE_USER_ACTION_SAVED_OBJECT,
      }),
      buildFilter({
        filters: [CommentType.persistableState, CommentType.externalReference],
        field: 'payload.comment.type',
        operator: 'or',
        type: CASE_USER_ACTION_SAVED_OBJECT,
      }),
    ]);
  }

  private static buildGenericTypeFilter(type: ActionTypeValues): KueryNode | undefined {
    return buildFilter({
      filters: [type],
      field: 'type',
      operator: 'or',
      type: CASE_USER_ACTION_SAVED_OBJECT,
    });
  }
}
