/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { curry } from 'lodash';

import { ActionTypeExecutorResult } from '../../../../actions/common';
import {
  CasePatchRequest,
  CasePostRequest,
  CommentRequest,
  CommentType,
} from '../../../common/api';
import { createExternalCaseClient } from '../../client';
import { CaseExecutorParamsSchema, CaseConfigurationSchema, CommentSchemaType } from './schema';
import {
  CaseExecutorResponse,
  ExecutorSubActionAddCommentParams,
  CaseActionType,
  CaseActionTypeExecutorOptions,
} from './types';
import * as i18n from './translations';

import { GetActionTypeParams, isCommentGeneratedAlert } from '..';
import { nullUser } from '../../common';

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
  });

  if (!supportedSubActions.includes(subAction)) {
    const errorMessage = `[Action][Case] subAction ${subAction} not implemented.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (subAction === 'create') {
    data = await caseClient.create({
      ...(subActionParams as CasePostRequest),
    });
  }

  if (subAction === 'update') {
    const updateParamsWithoutNullValues = Object.entries(subActionParams).reduce(
      (acc, [key, value]) => ({
        ...acc,
        ...(value != null ? { [key]: value } : {}),
      }),
      {} as CasePatchRequest
    );

    data = await caseClient.update({ cases: [updateParamsWithoutNullValues] });
  }

  if (subAction === 'addComment') {
    const { caseId, comment } = subActionParams as ExecutorSubActionAddCommentParams;
    const formattedComment = transformConnectorComment(comment);
    data = await caseClient.addComment({ caseId, comment: formattedComment });
  }

  return { status: 'ok', data: data ?? {}, actionId };
}

/**
 * This converts a connector style generated alert ({_id: string} | {_id: string}[]) to the expected format of addComment.
 */
interface AttachmentAlerts {
  ids: string[];
  indices: string[];
  rule: { id: string | null; name: string | null };
}
export const transformConnectorComment = (comment: CommentSchemaType): CommentRequest => {
  if (isCommentGeneratedAlert(comment)) {
    try {
      const genAlerts: Array<{
        _id: string;
        _index: string;
        ruleId: string | undefined;
        ruleName: string | undefined;
      }> = JSON.parse(
        `${comment.alerts.substring(0, comment.alerts.lastIndexOf('__SEPARATOR__'))}]`.replace(
          /__SEPARATOR__/gi,
          ','
        )
      );

      const { ids, indices, rule } = genAlerts.reduce<AttachmentAlerts>(
        (acc, { _id, _index, ruleId, ruleName }) => {
          // Mutation is faster than destructing.
          // Mutation usually leads to side effects but for this scenario it's ok to do it.
          acc.ids.push(_id);
          acc.indices.push(_index);
          // We assume one rule per batch of alerts
          acc.rule = { id: ruleId ?? null, name: ruleName ?? null };
          return acc;
        },
        { ids: [], indices: [], rule: { id: null, name: null } }
      );

      return {
        type: CommentType.generatedAlert,
        alertId: ids,
        index: indices,
        rule,
      };
    } catch (e) {
      throw new Error(`Error parsing generated alert in case connector -> ${e.message}`);
    }
  } else {
    return comment;
  }
};
