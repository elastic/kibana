/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';
import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import type { SavedObject } from '@kbn/core-saved-objects-common';
import { defaultSortField } from '../../../common/utils';
import type {
  CaseUserActionAttributesWithoutConnectorId,
  CaseUserActionResponse,
  FindTypes,
  UserActionFindRequest,
  ActionTypeValues,
  FindTypeField,
} from '../../../../common/api';
import { Actions, ActionTypes, CommentType } from '../../../../common/api';
import {
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
} from '../../../../common/constants';

import type { ServiceContext } from '../types';
import { transformFindResponseToExternalModel, transformToExternalModel } from '../transform';
import { buildFilter, combineFilters, NodeBuilderOperators } from '../../../client/utils';

interface FindOptions extends UserActionFindRequest {
  caseId: string;
  filter?: KueryNode;
}

export class UserActionFinder {
  constructor(private readonly context: ServiceContext) {}

  public async find({
    caseId,
    sortOrder,
    types,
    page,
    perPage,
    filter,
  }: FindOptions): Promise<SavedObjectsFindResponse<CaseUserActionResponse>> {
    try {
      this.context.log.debug(`Attempting to find user actions for case id: ${caseId}`);

      const finalFilter = combineFilters([filter, UserActionFinder.buildFilter(types)]);

      const userActions =
        await this.context.unsecuredSavedObjectsClient.find<CaseUserActionAttributesWithoutConnectorId>(
          {
            type: CASE_USER_ACTION_SAVED_OBJECT,
            hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
            page,
            perPage,
            sortField: 'created_at',
            sortOrder,
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

  private static buildFilter(types: FindOptions['types']) {
    let typeFilter: KueryNode | undefined;

    for (const type of types) {
      typeFilter = combineFilters(
        [typeFilter, UserActionFinder.buildFilterType(type)],
        NodeBuilderOperators.or
      );
    }

    return typeFilter;
  }

  private static buildFilterType(type: FindTypeField): KueryNode | undefined {
    switch (type) {
      case 'action':
        return UserActionFinder.buildActionFilter();
      case 'user':
      case 'alert':
        return UserActionFinder.buildUserAndAlertFilter(type);
      case 'attachment':
        return UserActionFinder.buildAttachmentsFilter();
      default:
        return UserActionFinder.buildGenericTypeFilter(type);
    }
  }

  private static buildActionFilter(): KueryNode | undefined {
    const filterForUserActionsExcludingComment = fromKueryExpression(
      `not ${CASE_USER_ACTION_SAVED_OBJECT}.attributes.type: ${ActionTypes.comment}`
    );

    return filterForUserActionsExcludingComment;
  }

  private static buildUserAndAlertFilter(
    type: typeof FindTypes.alert | typeof FindTypes.user
  ): KueryNode | undefined {
    return combineFilters(
      [
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
      ],
      NodeBuilderOperators.and
    );
  }

  private static buildAttachmentsFilter(): KueryNode | undefined {
    return combineFilters(
      [
        buildFilter({
          filters: [ActionTypes.comment],
          field: 'type',
          operator: 'or',
          type: CASE_USER_ACTION_SAVED_OBJECT,
        }),
        buildFilter({
          filters: [
            CommentType.persistableState,
            CommentType.externalReference,
            CommentType.actions,
          ],
          field: 'payload.comment.type',
          operator: 'or',
          type: CASE_USER_ACTION_SAVED_OBJECT,
        }),
      ],
      NodeBuilderOperators.and
    );
  }

  private static buildGenericTypeFilter(type: ActionTypeValues): KueryNode | undefined {
    return buildFilter({
      filters: [type],
      field: 'type',
      operator: 'or',
      type: CASE_USER_ACTION_SAVED_OBJECT,
    });
  }

  public async findStatusChanges({
    caseId,
    filter,
  }: {
    caseId: string;
    filter?: KueryNode;
  }): Promise<Array<SavedObject<CaseUserActionResponse>>> {
    try {
      this.context.log.debug('Attempting to find status changes');

      const updateActionFilter = buildFilter({
        filters: Actions.update,
        field: 'action',
        operator: 'or',
        type: CASE_USER_ACTION_SAVED_OBJECT,
      });

      const statusChangeFilter = buildFilter({
        filters: ActionTypes.status,
        field: 'type',
        operator: 'or',
        type: CASE_USER_ACTION_SAVED_OBJECT,
      });

      const combinedFilters = combineFilters([updateActionFilter, statusChangeFilter, filter]);

      const finder =
        this.context.unsecuredSavedObjectsClient.createPointInTimeFinder<CaseUserActionAttributesWithoutConnectorId>(
          {
            type: CASE_USER_ACTION_SAVED_OBJECT,
            hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
            sortField: defaultSortField,
            sortOrder: 'asc',
            filter: combinedFilters,
            perPage: MAX_DOCS_PER_PAGE,
          }
        );

      let userActions: Array<SavedObject<CaseUserActionResponse>> = [];
      for await (const findResults of finder.find()) {
        userActions = userActions.concat(
          findResults.saved_objects.map((so) =>
            transformToExternalModel(so, this.context.persistableStateAttachmentTypeRegistry)
          )
        );
      }

      return userActions;
    } catch (error) {
      this.context.log.error(`Error finding status changes: ${error}`);
      throw error;
    }
  }
}
