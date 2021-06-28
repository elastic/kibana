/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { curry } from 'lodash';
import { Logger } from 'src/core/server';
import { ActionTypeExecutorResult } from '../../../../actions/common';
import {
  CasePatchRequest,
  CasePostRequest,
  CommentRequest,
  CommentType,
  ENABLE_CASE_CONNECTOR,
} from '../../../common';
import { CaseExecutorParamsSchema, CaseConfigurationSchema, CommentSchemaType } from './schema';
import {
  CaseExecutorResponse,
  ExecutorSubActionAddCommentParams,
  CaseActionType,
  CaseActionTypeExecutorOptions,
} from './types';
import * as i18n from './translations';

import { GetActionTypeParams, isCommentGeneratedAlert, separator } from '..';
import { createCaseError } from '../../common';
import { CasesClient } from '../../client';

const supportedSubActions: string[] = ['create', 'update', 'addComment'];

// action type definition
export function getActionType({ logger, factory }: GetActionTypeParams): CaseActionType {
  return {
    id: '.case',
    minimumLicenseRequired: 'basic',
    name: i18n.NAME,
    validate: {
      config: CaseConfigurationSchema,
      params: CaseExecutorParamsSchema,
    },
    executor: curry(executor)({
      factory,
      logger,
    }),
  };
}

// action executor
async function executor(
  { logger, factory }: GetActionTypeParams,
  execOptions: CaseActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult<CaseExecutorResponse | {}>> {
  if (!ENABLE_CASE_CONNECTOR) {
    const msg = '[Action][Case] connector not supported';
    logger.error(msg);
    throw new Error(msg);
  }

  const { actionId, params } = execOptions;
  const { subAction, subActionParams } = params;
  let data: CaseExecutorResponse | null = null;

  let casesClient: CasesClient | undefined;

  if (!supportedSubActions.includes(subAction)) {
    const errorMessage = `[Action][Case] subAction ${subAction} not implemented.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  // When the actions framework provides the request and a way to retrieve the saved objects client with access to our
  // hidden types then remove this outer if block and initialize the casesClient using the factory.
  if (casesClient) {
    if (subAction === 'create') {
      try {
        data = await casesClient.cases.create({
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
        data = await casesClient.cases.update({ cases: [updateParamsWithoutNullValues] });
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
        data = await casesClient.attachments.add({ caseId, comment: formattedComment });
      } catch (error) {
        throw createCaseError({
          message: `Failed to create comment using connector case id: ${caseId}: ${error}`,
          error,
          logger,
        });
      }
    }
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
  if (isCommentGeneratedAlert(comment)) {
    try {
      const genAlerts: Array<{
        _id: string;
        _index: string;
        ruleId: string | undefined;
        ruleName: string | undefined;
      }> = JSON.parse(
        `${comment.alerts.substring(0, comment.alerts.lastIndexOf(separator))}]`.replace(
          new RegExp(separator, 'g'),
          ','
        )
      );

      const { ids, indices, rule } = genAlerts.reduce<AttachmentAlerts>(
        (acc, { _id, _index, ruleId, ruleName }) => {
          // Mutation is faster than destructing.
          // Mutation usually leads to side effects but for this scenario it's ok to do it.
          acc.ids.push(_id);
          acc.indices.push(_index);
          // We assume one rule per batch of alerts, this will use the rule information from the last entry in the array
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
        owner: comment.owner,
      };
    } catch (e) {
      throw createCaseError({
        message: `Error parsing generated alert in case connector -> ${e}`,
        error: e,
        logger,
      });
    }
  } else {
    return comment;
  }
};
