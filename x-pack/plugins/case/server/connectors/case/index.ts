/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { curry } from 'lodash';
import { Logger } from 'src/core/server';
import { ActionTypeExecutorResult } from '../../../../actions/common';
import { CasePatchRequest, CasePostRequest, CommentRequest } from '../../../common/api';
import { createExternalCaseClient } from '../../client';
import { CaseExecutorParamsSchema, CaseConfigurationSchema, CommentSchemaType } from './schema';
import {
  CaseExecutorResponse,
  ExecutorSubActionAddCommentParams,
  CaseActionType,
  CaseActionTypeExecutorOptions,
} from './types';
import * as i18n from './translations';

import { GetActionTypeParams } from '..';
import { nullUser } from '../../common';
import { createCaseError } from '../../common/error';

const supportedSubActions: string[] = ['create', 'update', 'addComment'];

// action type definition
export function getActionType({
  logger,
  caseService,
  caseConfigureService,
  connectorMappingsService,
  userActionService,
  alertsService,
}: GetActionTypeParams): CaseActionType {
  return {
    id: '.case',
    minimumLicenseRequired: 'basic',
    name: i18n.NAME,
    validate: {
      config: CaseConfigurationSchema,
      params: CaseExecutorParamsSchema,
    },
    executor: curry(executor)({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      logger,
      userActionService,
    }),
  };
}

// action executor
async function executor(
  {
    alertsService,
    caseConfigureService,
    caseService,
    connectorMappingsService,
    logger,
    userActionService,
  }: GetActionTypeParams,
  execOptions: CaseActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult<CaseExecutorResponse | {}>> {
  const { actionId, params, services } = execOptions;
  const { subAction, subActionParams } = params;
  let data: CaseExecutorResponse | null = null;

  const { savedObjectsClient, scopedClusterClient } = services;
  const caseClient = createExternalCaseClient({
    savedObjectsClient,
    scopedClusterClient,
    // we might want the user information to be passed as part of the action request
    user: nullUser,
    caseService,
    caseConfigureService,
    connectorMappingsService,
    userActionService,
    alertsService,
    logger,
  });

  if (!supportedSubActions.includes(subAction)) {
    const errorMessage = `[Action][Case] subAction ${subAction} not implemented.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (subAction === 'create') {
    try {
      data = await caseClient.create({
        ...(subActionParams as CasePostRequest),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to create a case using connector: ${error}`,
        error,
        logger,
      });
    }
  }

  if (subAction === 'update') {
    const updateParamsWithoutNullValues = Object.entries(subActionParams).reduce(
      (acc, [key, value]) => ({
        ...acc,
        ...(value != null ? { [key]: value } : {}),
      }),
      {} as CasePatchRequest
    );

    try {
      data = await caseClient.update({ cases: [updateParamsWithoutNullValues] });
    } catch (error) {
      throw createCaseError({
        message: `Failed to update case using connector id: ${updateParamsWithoutNullValues?.id} version: ${updateParamsWithoutNullValues?.version}: ${error}`,
        error,
        logger,
      });
    }
  }

  if (subAction === 'addComment') {
    const { caseId, comment } = subActionParams as ExecutorSubActionAddCommentParams;
    try {
      const formattedComment = transformConnectorComment(comment, logger);
      data = await caseClient.addComment({ caseId, comment: formattedComment });
    } catch (error) {
      throw createCaseError({
        message: `Failed to create comment using connector case id: ${caseId}: ${error}`,
        error,
        logger,
      });
    }
  }

  return { status: 'ok', data: data ?? {}, actionId };
}

/**
 * Convert a connector style comment passed through the action plugin to the expected format for the add comment functionality.
 *
 * @param comment an object defining the comment to be attached to a case/sub case
 * @param logger an optional logger to handle logging an error if parsing failed
 *
 * Note: This is exported so that the integration tests can use it.
 */
export const transformConnectorComment = (
  comment: CommentSchemaType,
  logger?: Logger
): CommentRequest => {
  return comment;
};
