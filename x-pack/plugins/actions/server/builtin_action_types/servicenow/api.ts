/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { flow } from 'lodash';
import {
  ExternalServiceParams,
  PushToServiceResponse,
  PushToServiceApiHandlerArgs,
  HandshakeApiHandlerArgs,
  GetIncidentApiHandlerArgs,
  ExternalServiceApi,
  PrepareFieldsForTransformArgs,
  PipedField,
  TransformFieldsArgs,
} from './types';
import { transformers, Transformer } from '../case/transformers';

const handshakeHandler = async ({
  externalService,
  mapping,
  params,
}: HandshakeApiHandlerArgs) => {};
const getIncidentHandler = async ({
  externalService,
  mapping,
  params,
}: GetIncidentApiHandlerArgs) => {};

const pushToServiceHandler = async ({
  externalService,
  mapping,
  params,
  secrets,
}: PushToServiceApiHandlerArgs): Promise<PushToServiceResponse> => {
  const { savedObjectId, externalId } = params;
  const existingIncident = await externalService.findIncidents({ user_input: savedObjectId });
  const updateIncident = existingIncident || externalId ? true : false;
  const defaultPipes = updateIncident ? ['informationUpdated'] : ['informationCreated'];
  let currentIncident: ExternalServiceParams | undefined;
  let res: PushToServiceResponse;

  if (externalId) {
    currentIncident = await externalService.getIncident(externalId);
  }

  let incident = {};
  if (mapping) {
    const fields = prepareFieldsForTransformation({
      params,
      mapping,
      defaultPipes,
    });

    incident = transformFields({
      params,
      fields,
      currentIncident,
    });
  }
  incident = params;

  if (updateIncident) {
    res = await externalService.updateIncident({ incidentId: externalId, incident });
  } else {
    res = await externalService.createIncident({
      incident,
      caller_id: secrets.username,
      user_input: savedObjectId,
    });
  }
  return res;
};

export const prepareFieldsForTransformation = ({
  params,
  mapping,
  defaultPipes = ['informationCreated'],
}: PrepareFieldsForTransformArgs): PipedField[] => {
  return Object.keys(params.externalObject)
    .filter((p) => mapping.get(p)?.actionType != null && mapping.get(p)?.actionType !== 'nothing')
    .map((p) => {
      const actionType = mapping.get(p)?.actionType ?? 'nothing';
      return {
        key: p,
        value: params.externalObject[p],
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
    const transform = flow<Transformer>(...cur.pipes.map((p) => transformers[p]));
    return {
      ...prev,
      [cur.key]: transform({
        value: cur.value,
        previousValue: currentIncident ? currentIncident[cur.key] : '',
      }).value,
    };
  }, {});
};

export const api: ExternalServiceApi = {
  handshake: handshakeHandler,
  pushToService: pushToServiceHandler,
  getIncident: getIncidentHandler,
};
