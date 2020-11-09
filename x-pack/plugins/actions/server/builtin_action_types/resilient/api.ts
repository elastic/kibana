/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ExternalServiceParams,
  PushToServiceApiHandlerArgs,
  HandshakeApiHandlerArgs,
  GetIncidentApiHandlerArgs,
  ExternalServiceApi,
  Incident,
  GetIncidentTypesHandlerArgs,
  GetSeverityHandlerArgs,
  PushToServiceApiParams,
  PushToServiceResponse,
  GetCommonFieldsHandlerArgs,
} from './types';

// TODO: to remove, need to support Case
import { transformFields, prepareFieldsForTransformation, transformComments } from '../case/utils';

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

const getFieldsHandler = async ({ externalService }: GetCommonFieldsHandlerArgs) => {
  const res = await externalService.getFields();
  return res;
};
const getIncidentTypesHandler = async ({ externalService }: GetIncidentTypesHandlerArgs) => {
  const res = await externalService.getIncidentTypes();
  return res;
};

const getSeverityHandler = async ({ externalService }: GetSeverityHandlerArgs) => {
  const res = await externalService.getSeverity();
  return res;
};

const pushToServiceHandler = async ({
  externalService,
  mapping,
  params,
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
        `Retrieving Incident by id ${externalId} from IBM Resilient was failed with exception: ${ex}`
      );
    }
  }

  let incident: Incident;
  // TODO: should be removed later but currently keep it for the Case implementation support
  if (mapping) {
    const fields = prepareFieldsForTransformation({
      externalCase: params.externalObject,
      mapping,
      defaultPipes,
    });

    const transformedFields = transformFields<
      PushToServiceApiParams,
      ExternalServiceParams,
      Incident
    >({
      params,
      fields,
      currentIncident,
    });

    const { incidentTypes, severityCode } = params;
    incident = {
      name: transformedFields.name,
      description: transformedFields.description,
      incidentTypes,
      severityCode,
    };
  } else {
    const { title, description, incidentTypes, severityCode } = params;
    incident = { name: title, description, incidentTypes, severityCode };
  }

  if (externalId != null) {
    res = await externalService.updateIncident({
      incidentId: externalId,
      incident,
    });
  } else {
    res = await externalService.createIncident({
      incident: {
        ...incident,
      },
    });
  }

  if (comments && Array.isArray(comments) && comments.length > 0) {
    if (mapping && mapping.get('comments')?.actionType === 'nothing') {
      return res;
    }
    const commentsTransformed = mapping
      ? transformComments(comments, ['informationAdded'])
      : comments;

    res.comments = [];
    for (const currentComment of commentsTransformed) {
      const comment = await externalService.createComment({
        incidentId: res.id,
        comment: currentComment,
      });
      res.comments = [
        ...(res.comments ?? []),
        {
          commentId: comment.commentId,
          pushedDate: comment.pushedDate,
        },
      ];
    }
  }

  return res;
};

export const api: ExternalServiceApi = {
  getFields: getFieldsHandler,
  getIncident: getIncidentHandler,
  handshake: handshakeHandler,
  incidentTypes: getIncidentTypesHandler,
  pushToService: pushToServiceHandler,
  severity: getSeverityHandler,
};
