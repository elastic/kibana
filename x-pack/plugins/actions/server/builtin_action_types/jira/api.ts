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
  GetFieldsByIssueTypeHandlerArgs,
  GetIssueTypesHandlerArgs,
  PushToServiceApiParams,
  PushToServiceResponse,
} from './types';

// TODO: to remove, need to support Case
import { prepareFieldsForTransformation, transformFields, transformComments } from '../case/utils';

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

const getIssueTypesHandler = async ({ externalService }: GetIssueTypesHandlerArgs) => {
  const res = await externalService.getIssueTypes();
  return res;
};

const getFieldsByIssueTypeHandler = async ({
  externalService,
  params,
}: GetFieldsByIssueTypeHandlerArgs) => {
  const { id } = params;
  const res = await externalService.getFieldsByIssueType(id);
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
        `Retrieving Incident by id ${externalId} from Jira failed with exception: ${ex}`
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

    incident = transformFields<PushToServiceApiParams, ExternalServiceParams, Incident>({
      params,
      fields,
      currentIncident,
    });
  } else {
    const { title, description, priority, labels, issueType } = params;
    incident = { summary: title, description, priority, labels, issueType };
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
  handshake: handshakeHandler,
  pushToService: pushToServiceHandler,
  getIncident: getIncidentHandler,
  issueTypes: getIssueTypesHandler,
  fieldsByIssueType: getFieldsByIssueTypeHandler,
};
