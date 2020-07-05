/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry, flow, get } from 'lodash';
import { schema } from '@kbn/config-schema';

import { ActionTypeExecutorOptions, ActionTypeExecutorResult, ActionType } from '../../types';

import { ExecutorParamsSchema } from './schema';

import {
  CreateExternalServiceArgs,
  CreateActionTypeArgs,
  ExecutorParams,
  MapRecord,
  AnyParams,
  CreateExternalServiceBasicArgs,
  PrepareFieldsForTransformArgs,
  PipedField,
  TransformFieldsArgs,
  Comment,
  ExecutorSubActionPushParams,
} from './types';

import { transformers } from './transformers';

import { SUPPORTED_SOURCE_FIELDS } from './constants';

export const normalizeMapping = (supportedFields: string[], mapping: MapRecord[]): MapRecord[] => {
  // Prevent prototype pollution and remove unsupported fields
  return mapping.filter(
    (m) =>
      m.source !== '__proto__' && m.target !== '__proto__' && supportedFields.includes(m.source)
  );
};

export const buildMap = (mapping: MapRecord[]): Map<string, MapRecord> => {
  return normalizeMapping(SUPPORTED_SOURCE_FIELDS, mapping).reduce((fieldsMap, field) => {
    const { source, target, actionType } = field;
    fieldsMap.set(source, { target, actionType });
    fieldsMap.set(target, { target: source, actionType });
    return fieldsMap;
  }, new Map());
};

export const mapParams = (
  params: Partial<ExecutorSubActionPushParams>,
  mapping: Map<string, MapRecord>
): AnyParams => {
  return Object.keys(params).reduce((prev: AnyParams, curr: string): AnyParams => {
    const field = mapping.get(curr);
    if (field) {
      prev[field.target] = get(params, curr);
    }
    return prev;
  }, {});
};

export const createConnectorExecutor = ({
  api,
  createExternalService,
}: CreateExternalServiceBasicArgs) => async (
  execOptions: ActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult> => {
  const { actionId, config, params, secrets } = execOptions;
  const { subAction, subActionParams } = params as ExecutorParams;
  let data = {};

  const res: Pick<ActionTypeExecutorResult, 'status'> &
    Pick<ActionTypeExecutorResult, 'actionId'> = {
    status: 'ok',
    actionId,
  };

  const externalService = createExternalService({
    config,
    secrets,
  });

  if (!api[subAction]) {
    throw new Error('[Action][ExternalService] Unsupported subAction type.');
  }

  if (subAction !== 'pushToService') {
    throw new Error('[Action][ExternalService] subAction not implemented.');
  }

  if (subAction === 'pushToService') {
    const pushToServiceParams = subActionParams as ExecutorSubActionPushParams;
    const { comments, externalId, ...restParams } = pushToServiceParams;

    const mapping = buildMap(config.casesConfiguration.mapping);
    const externalCase = mapParams(restParams, mapping);

    data = await api.pushToService({
      externalService,
      mapping,
      params: { ...pushToServiceParams, externalCase },
    });
  }

  return {
    ...res,
    data,
  };
};

export const createConnector = ({
  api,
  config,
  validate,
  createExternalService,
  validationSchema,
}: CreateExternalServiceArgs) => {
  return ({
    configurationUtilities,
    executor = createConnectorExecutor({ api, createExternalService }),
  }: CreateActionTypeArgs): ActionType => ({
    ...config,
    validate: {
      config: schema.object(validationSchema.config, {
        validate: curry(validate.config)(configurationUtilities),
      }),
      secrets: schema.object(validationSchema.secrets, {
        validate: curry(validate.secrets)(configurationUtilities),
      }),
      params: ExecutorParamsSchema,
    },
    executor,
  });
};

export const prepareFieldsForTransformation = ({
  externalCase,
  mapping,
  defaultPipes = ['informationCreated'],
}: PrepareFieldsForTransformArgs): PipedField[] => {
  return Object.keys(externalCase)
    .filter((p) => mapping.get(p)?.actionType != null && mapping.get(p)?.actionType !== 'nothing')
    .map((p) => {
      const actionType = mapping.get(p)?.actionType ?? 'nothing';
      return {
        key: p,
        value: externalCase[p],
        actionType,
        pipes: actionType === 'append' ? [...defaultPipes, 'append'] : defaultPipes,
      };
    });
};

export const transformFields = ({
  params,
  fields,
  currentIncident,
}: TransformFieldsArgs): Record<string, string> => {
  return fields.reduce((prev, cur) => {
    const transform = flow(...cur.pipes.map((p) => transformers[p]));
    return {
      ...prev,
      [cur.key]: transform({
        value: cur.value,
        date: params.updatedAt ?? params.createdAt,
        user:
          (params.updatedBy != null
            ? params.updatedBy.fullName
              ? params.updatedBy.fullName
              : params.updatedBy.username
            : params.createdBy.fullName
            ? params.createdBy.fullName
            : params.createdBy.username) ?? '',
        previousValue: currentIncident ? currentIncident[cur.key] : '',
      }).value,
    };
  }, {});
};

export const transformComments = (comments: Comment[], pipes: string[]): Comment[] => {
  return comments.map((c) => ({
    ...c,
    comment: flow(...pipes.map((p) => transformers[p]))({
      value: c.comment,
      date: c.updatedAt ?? c.createdAt,
      user:
        (c.updatedBy != null
          ? c.updatedBy.fullName
            ? c.updatedBy.fullName
            : c.updatedBy.username
          : c.createdBy.fullName
          ? c.createdBy.fullName
          : c.createdBy.username) ?? '',
    }).value,
  }));
};

export const getErrorMessage = (connector: string, msg: string) => {
  return `[Action][${connector}]: ${msg}`;
};
