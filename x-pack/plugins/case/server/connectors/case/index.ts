/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry } from 'lodash';

import { KibanaRequest } from 'kibana/server';
import { ActionTypeExecutorResult } from '../../../../actions/common';
import { CasePatchRequest, CasePostRequest } from '../../../common/api';
import { createCaseClient } from '../../client';
import { CaseExecutorParamsSchema, CaseConfigurationSchema } from './schema';
import {
  CaseExecutorResponse,
  ExecutorSubActionAddCommentParams,
  CaseActionType,
  CaseActionTypeExecutorOptions,
} from './types';
import * as i18n from './translations';

import { GetActionTypeParams } from '..';

const supportedSubActions: string[] = ['create', 'update', 'addComment'];

// action type definition
export function getActionType({
  logger,
  caseService,
  caseConfigureService,
  userActionService,
}: GetActionTypeParams): CaseActionType {
  return {
    id: '.case',
    minimumLicenseRequired: 'gold',
    name: i18n.NAME,
    validate: {
      config: CaseConfigurationSchema,
      params: CaseExecutorParamsSchema,
    },
    executor: curry(executor)({ logger, caseService, caseConfigureService, userActionService }),
  };
}

// action executor
async function executor(
  { logger, caseService, caseConfigureService, userActionService }: GetActionTypeParams,
  execOptions: CaseActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult<CaseExecutorResponse | {}>> {
  const { actionId, params, services } = execOptions;
  const { subAction, subActionParams } = params;
  let data: CaseExecutorResponse | null = null;

  const { savedObjectsClient } = services;
  const caseClient = createCaseClient({
    savedObjectsClient,
    request: {} as KibanaRequest,
    caseService,
    caseConfigureService,
    userActionService,
  });

  if (!supportedSubActions.includes(subAction)) {
    const errorMessage = `[Action][Case] subAction ${subAction} not implemented.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (subAction === 'create') {
    data = await caseClient.create({ theCase: subActionParams as CasePostRequest });
  }

  if (subAction === 'update') {
    const updateParamsWithoutNullValues = Object.entries(subActionParams).reduce(
      (acc, [key, value]) => ({
        ...acc,
        ...(value != null ? { [key]: value } : {}),
      }),
      {} as CasePatchRequest
    );

    data = await caseClient.update({ cases: { cases: [updateParamsWithoutNullValues] } });
  }

  if (subAction === 'addComment') {
    const { caseId, comment } = subActionParams as ExecutorSubActionAddCommentParams;
    data = await caseClient.addComment({ caseId, comment });
  }

  return { status: 'ok', data: data ?? {}, actionId };
}
