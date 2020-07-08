/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { flow } from 'lodash';
import {
  ExternalServiceParams,
  PushToServiceApiHandlerArgs,
  HandshakeApiHandlerArgs,
  GetIncidentApiHandlerArgs,
  ExternalServiceApi,
} from './types';

// TODO: to remove, need to support Case
import { transformers } from '../case/transformers';
import { PushToServiceResponse, TransformFieldsArgs } from './case_types';
import { prepareFieldsForTransformation } from '../case/utils';

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
  logger,
}: PushToServiceApiHandlerArgs): Promise<PushToServiceResponse> => {
  const { externalId, comments } = params;
  const updateIncident = externalId ? true : false;
  const defaultPipes = updateIncident ? ['informationUpdated'] : ['informationCreated'];
  let currentIncident: ExternalServiceParams | undefined;
  let res: PushToServiceResponse;

  if (externalId) {
    try {
      currentIncident = await externalService.getIncident(externalId);
    } catch (ex) {
      logger.debug(
        `Retrieving Incident by id ${externalId} from ServiceNow was failed with exception: ${ex}`
      );
    }
  }

  let incident = {};
  // TODO: should be removed later but currently keep it for the Case implementation support
  if (mapping) {
    const fields = prepareFieldsForTransformation({
      externalCase: params.externalObject,
      mapping,
      defaultPipes,
    });

    incident = transformFields({
      params,
      fields,
      currentIncident,
    });
  } else {
    incident = { ...params, short_description: params.title, comments: params.comment };
  }

  if (updateIncident) {
    res = await externalService.updateIncident({
      incidentId: externalId,
      incident,
    });
  } else {
    res = await externalService.createIncident({
      incident: {
        ...incident,
        caller_id: secrets.username,
      },
    });
  }

  // TODO: should temporary keep comments for a Case usage
  if (
    comments &&
    Array.isArray(comments) &&
    comments.length > 0 &&
    mapping &&
    mapping.get('comments')?.actionType !== 'nothing'
  ) {
    res.comments = [];

    const fieldsKey = mapping.get('comments')?.target ?? 'comments';
    for (const currentComment of comments) {
      await externalService.updateIncident({
        incidentId: res.id,
        incident: {
          ...incident,
          [fieldsKey]: currentComment.comment,
        },
      });
      res.comments = [
        ...(res.comments ?? []),
        {
          commentId: currentComment.commentId,
          pushedDate: res.pushedDate,
        },
      ];
    }
  }
  return res;
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

export const api: ExternalServiceApi = {
  handshake: handshakeHandler,
  pushToService: pushToServiceHandler,
  getIncident: getIncidentHandler,
};
