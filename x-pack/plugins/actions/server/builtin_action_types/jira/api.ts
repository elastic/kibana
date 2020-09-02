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
  Incident,
  GetFieldsByIssueTypeHandlerArgs,
  GetIssueTypesHandlerArgs,
} from './types';

// TODO: to remove, need to support Case
import { transformers } from '../case/transformers';
import {
  PushToServiceResponse,
  TransformFieldsArgs,
  Comment,
  EntityInformation,
} from './case_types';
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

    incident = transformFields({
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

export const transformFields = ({
  params,
  fields,
  currentIncident,
}: TransformFieldsArgs): Incident => {
  return fields.reduce((prev, cur) => {
    const transform = flow(...cur.pipes.map((p) => transformers[p]));
    return {
      ...prev,
      [cur.key]: transform({
        value: cur.value,
        date: params.updatedAt ?? params.createdAt,
        user: getEntity(params),
        previousValue: currentIncident ? currentIncident[cur.key] : '',
      }).value,
    };
  }, {} as Incident);
};

export const transformComments = (comments: Comment[], pipes: string[]): Comment[] => {
  return comments.map((c) => ({
    ...c,
    comment: flow(...pipes.map((p) => transformers[p]))({
      value: c.comment,
      date: c.updatedAt ?? c.createdAt,
      user: getEntity(c),
    }).value,
  }));
};

export const getEntity = (entity: EntityInformation): string =>
  (entity.updatedBy != null
    ? entity.updatedBy.fullName
      ? entity.updatedBy.fullName
      : entity.updatedBy.username
    : entity.createdBy != null
    ? entity.createdBy.fullName
      ? entity.createdBy.fullName
      : entity.createdBy.username
    : '') ?? '';

export const api: ExternalServiceApi = {
  handshake: handshakeHandler,
  pushToService: pushToServiceHandler,
  getIncident: getIncidentHandler,
  issueTypes: getIssueTypesHandler,
  fieldsByIssueType: getFieldsByIssueTypeHandler,
};
