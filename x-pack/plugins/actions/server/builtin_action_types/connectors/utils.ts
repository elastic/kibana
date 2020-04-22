/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry, flow } from 'lodash';
import { schema } from '@kbn/config-schema';
import { AxiosInstance, Method, AxiosResponse } from 'axios';

import { ActionTypeExecutorOptions, ActionTypeExecutorResult, ActionType } from '../../types';

import { ExecutorParamsSchema } from './schema';

import {
  CreateConnectorArgs,
  ConnectorPublicConfigurationType,
  CreateActionTypeArgs,
  ExecutorParams,
  MapRecord,
  AnyParams,
  CreateConnectorBasicArgs,
  PrepareFieldsForTransformArgs,
  PipedField,
  TransformFieldsArgs,
  Comment,
} from './types';

import * as transformers from './transformers';

import { SUPPORTED_SOURCE_FIELDS } from './constants';

export const normalizeMapping = (supportedFields: string[], mapping: MapRecord[]): MapRecord[] => {
  // Prevent prototype pollution and remove unsupported fields
  return mapping.filter(
    m => m.source !== '__proto__' && m.target !== '__proto__' && supportedFields.includes(m.source)
  );
};

export const buildMap = (mapping: MapRecord[]): Map<string, any> => {
  return normalizeMapping(SUPPORTED_SOURCE_FIELDS, mapping).reduce((fieldsMap, field) => {
    const { source, target, actionType } = field;
    fieldsMap.set(source, { target, actionType });
    fieldsMap.set(target, { target: source, actionType });
    return fieldsMap;
  }, new Map());
};

export const mapParams = (params: any, mapping: Map<string, any>) => {
  return Object.keys(params).reduce((prev: AnyParams, curr: string): AnyParams => {
    const field = mapping.get(curr);
    if (field) {
      prev[field.target] = params[curr];
    }
    return prev;
  }, {});
};

export const createConnectorExecutor = ({
  api,
  createExternalService,
}: CreateConnectorBasicArgs) => async (
  execOptions: ActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult> => {
  const actionId = execOptions.actionId;
  const {
    casesConfiguration: { mapping: configurationMapping },
  } = execOptions.config as ConnectorPublicConfigurationType;

  const params = execOptions.params as ExecutorParams;
  const { action, actionParams } = params;
  const { comments, externalId, ...restParams } = actionParams;

  const mapping = buildMap(configurationMapping);
  const externalCase = mapParams(restParams, mapping);

  const res: Pick<ActionTypeExecutorResult, 'status'> &
    Pick<ActionTypeExecutorResult, 'actionId'> = {
    status: 'ok',
    actionId,
  };

  const externalService = createExternalService({
    config: execOptions.config,
    secrets: execOptions.secrets,
  });

  if (!api[action]) {
    throw new Error('[Action][Connector] Unsupported action type');
  }

  const data = await api[action]({
    externalService,
    mapping,
    params: { ...actionParams, externalCase },
  });

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
}: CreateConnectorArgs) => {
  return ({
    configurationUtilities,
    executor = createConnectorExecutor({ api, createExternalService }),
  }: CreateActionTypeArgs): ActionType => ({
    id: config.id,
    name: config.name,
    minimumLicenseRequired: 'platinum',
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

export const throwIfNotAlive = (
  status: number,
  contentType: string,
  validStatusCodes: number[] = [200, 201, 204]
) => {
  if (!validStatusCodes.includes(status) || !contentType.includes('application/json')) {
    throw new Error('Instance is not alive.');
  }
};

export const request = async ({
  axios,
  url,
  method = 'get',
  data = {},
}: {
  axios: AxiosInstance;
  url: string;
  method?: Method;
  data?: any;
}): Promise<AxiosResponse> => {
  const res = await axios(url, { method, data });
  throwIfNotAlive(res.status, res.headers['content-type']);
  return res;
};

export const patch = ({
  axios,
  url,
  data,
}: {
  axios: AxiosInstance;
  url: string;
  data: any;
}): Promise<AxiosResponse> => {
  return request({
    axios,
    url,
    method: 'patch',
    data,
  });
};

export const addTimeZoneToDate = (date: string, timezone = 'GMT'): string => {
  return `${date} ${timezone}`;
};

export const prepareFieldsForTransformation = ({
  params,
  mapping,
  defaultPipes = ['informationCreated'],
}: PrepareFieldsForTransformArgs): PipedField[] => {
  return Object.keys(params.externalCase)
    .filter(p => mapping.get(p).actionType !== 'nothing')
    .map(p => ({
      key: p,
      value: params.externalCase[p],
      actionType: mapping.get(p).actionType,
      pipes: [...defaultPipes],
    }))
    .map(p => ({
      ...p,
      pipes: p.actionType === 'append' ? [...p.pipes, 'append'] : p.pipes,
    }));
};

const t = { ...transformers } as { [index: string]: Function }; // TODO: Find a better solution if exists.

export const transformFields = ({ params, fields, currentIncident }: TransformFieldsArgs) => {
  return fields.reduce((prev, cur) => {
    const transform = flow(...cur.pipes.map(p => t[p]));
    prev[cur.key] = transform({
      value: cur.value,
      date: params.updatedAt ?? params.createdAt,
      user:
        params.updatedBy != null
          ? params.updatedBy.fullName
            ? params.updatedBy.fullName
            : params.updatedBy.username
          : params.createdBy.fullName
          ? params.createdBy.fullName
          : params.createdBy.username,
      previousValue: currentIncident ? currentIncident[cur.key] : '',
    }).value;
    return prev;
  }, {} as any);
};

export const transformComments = (comments: Comment[], pipes: string[]): Comment[] => {
  return comments.map(c => ({
    ...c,
    comment: flow(...pipes.map(p => t[p]))({
      value: c.comment,
      date: c.updatedAt ?? c.createdAt,
      user:
        c.updatedBy != null
          ? c.updatedBy.fullName
            ? c.updatedBy.fullName
            : c.updatedBy.username
          : c.createdBy.fullName
          ? c.createdBy.fullName
          : c.createdBy.username,
    }).value,
  }));
};

export const getErrorMessage = (connector: string, msg: string) => {
  return `[Action][${connector}]: ${msg}`;
};
