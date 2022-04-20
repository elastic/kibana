/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { flow } from 'lodash';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { isPushedUserAction } from '../../../common/utils/user_actions';
import {
  ActionConnector,
  CaseFullExternalService,
  CaseResponse,
  CaseUserActionsResponse,
  CommentResponse,
  CommentResponseAlertsType,
  CommentType,
  ConnectorMappingsAttributes,
  CommentAttributes,
  CommentRequestUserType,
  CommentRequestAlertType,
  CommentRequestActionsType,
  ActionTypes,
} from '../../../common/api';
import { CasesClientGetAlertsResponse } from '../alerts/types';
import {
  BasicParams,
  EntityInformation,
  ExternalServiceComment,
  ExternalServiceParams,
  Incident,
  MapIncident,
  PipedField,
  PrepareFieldsForTransformArgs,
  PushToServiceApiParams,
  Transformer,
  TransformerArgs,
  TransformFieldsArgs,
} from './types';
import { getAlertIds } from '../utils';
import { CasesConnectorsMap } from '../../connectors';

interface CreateIncidentArgs {
  actionsClient: ActionsClient;
  theCase: CaseResponse;
  userActions: CaseUserActionsResponse;
  connector: ActionConnector;
  mappings: ConnectorMappingsAttributes[];
  alerts: CasesClientGetAlertsResponse;
  casesConnectors: CasesConnectorsMap;
}

export const getLatestPushInfo = (
  connectorId: string,
  userActions: CaseUserActionsResponse
): { index: number; pushedInfo: CaseFullExternalService } | null => {
  for (const [index, action] of [...userActions].reverse().entries()) {
    if (isPushedUserAction(action) && connectorId === action.payload.externalService.connector_id) {
      try {
        const pushedInfo = action.payload.externalService;
        // We returned the index of the element in the userActions array.
        // As we traverse the userActions in reverse we need to calculate the index of a normal traversal
        return {
          index: userActions.length - index - 1,
          pushedInfo,
        };
      } catch (e) {
        // ignore parse failures and check the next user action
      }
    }
  }

  return null;
};

const getCommentContent = (comment: CommentResponse): string => {
  if (comment.type === CommentType.user) {
    return comment.comment;
  } else if (comment.type === CommentType.alert) {
    const ids = getAlertIds(comment);
    return `Alert with ids ${ids.join(', ')} added to case`;
  } else if (
    comment.type === CommentType.actions &&
    (comment.actions.type === 'isolate' || comment.actions.type === 'unisolate')
  ) {
    const firstHostname =
      comment.actions.targets?.length > 0 ? comment.actions.targets[0].hostname : 'unknown';
    const totalHosts = comment.actions.targets.length;
    const actionText = comment.actions.type === 'isolate' ? 'Isolated' : 'Released';
    const additionalHostsText = totalHosts - 1 > 0 ? `and ${totalHosts - 1} more ` : ``;

    return `${actionText} host ${firstHostname} ${additionalHostsText}with comment: ${comment.comment}`;
  }

  return '';
};

interface CountAlertsInfo {
  totalComments: number;
  pushed: number;
  totalAlerts: number;
}

const getAlertsInfo = (
  comments: CaseResponse['comments']
): { totalAlerts: number; hasUnpushedAlertComments: boolean } => {
  const countingInfo = { totalComments: 0, pushed: 0, totalAlerts: 0 };

  const res =
    comments?.reduce<CountAlertsInfo>(({ totalComments, pushed, totalAlerts }, comment) => {
      if (comment.type === CommentType.alert) {
        return {
          totalComments: totalComments + 1,
          pushed: comment.pushed_at != null ? pushed + 1 : pushed,
          totalAlerts: totalAlerts + (Array.isArray(comment.alertId) ? comment.alertId.length : 1),
        };
      }
      return { totalComments, pushed, totalAlerts };
    }, countingInfo) ?? countingInfo;

  return {
    totalAlerts: res.totalAlerts,
    hasUnpushedAlertComments: res.totalComments > res.pushed,
  };
};

const addAlertMessage = (
  caseId: string,
  caseComments: CaseResponse['comments'],
  comments: ExternalServiceComment[]
): ExternalServiceComment[] => {
  const { totalAlerts, hasUnpushedAlertComments } = getAlertsInfo(caseComments);

  const newComments = [...comments];

  if (hasUnpushedAlertComments) {
    newComments.push({
      comment: `Elastic Alerts attached to the case: ${totalAlerts}`,
      commentId: `${caseId}-total-alerts`,
    });
  }

  return newComments;
};

export const createIncident = async ({
  actionsClient,
  theCase,
  userActions,
  connector,
  mappings,
  alerts,
  casesConnectors,
}: CreateIncidentArgs): Promise<MapIncident> => {
  const {
    comments: caseComments,
    title,
    description,
    created_at: createdAt,
    created_by: createdBy,
    updated_at: updatedAt,
    updated_by: updatedBy,
  } = theCase;

  const params = { title, description, createdAt, createdBy, updatedAt, updatedBy };
  const latestPushInfo = getLatestPushInfo(connector.id, userActions);
  const externalId = latestPushInfo?.pushedInfo?.external_id ?? null;
  const defaultPipes = externalId ? ['informationUpdated'] : ['informationCreated'];
  let currentIncident: ExternalServiceParams | undefined;

  const externalServiceFields =
    casesConnectors.get(connector.actionTypeId)?.format(theCase, alerts) ?? {};

  let incident: Partial<PushToServiceApiParams['incident']> = { ...externalServiceFields };

  if (externalId) {
    try {
      currentIncident = (await actionsClient.execute({
        actionId: connector.id,
        params: {
          subAction: 'getIncident',
          subActionParams: { externalId },
        },
      })) as unknown as ExternalServiceParams | undefined;
    } catch (ex) {
      throw new Error(
        `Retrieving Incident by id ${externalId} from ${connector.actionTypeId} failed with exception: ${ex}`
      );
    }
  }

  const fields = prepareFieldsForTransformation({
    defaultPipes,
    mappings,
    params,
  });

  const transformedFields = transformFields<BasicParams, ExternalServiceParams, Incident>({
    params,
    fields,
    currentIncident,
  });

  incident = { ...incident, ...transformedFields, externalId };

  const commentsIdsToBeUpdated = new Set(
    userActions
      .slice(latestPushInfo?.index ?? 0)
      .filter((action) => action.type === ActionTypes.comment)
      .map((action) => action.comment_id)
  );

  const commentsToBeUpdated = caseComments?.filter(
    (comment) =>
      // We push only user's comments
      (comment.type === CommentType.user || comment.type === CommentType.actions) &&
      commentsIdsToBeUpdated.has(comment.id)
  );

  let comments: ExternalServiceComment[] = [];

  if (commentsToBeUpdated && Array.isArray(commentsToBeUpdated) && commentsToBeUpdated.length > 0) {
    const commentsMapping = mappings.find((m) => m.source === 'comments');
    if (commentsMapping?.action_type !== 'nothing') {
      comments = transformComments(commentsToBeUpdated, ['informationAdded']);
    }
  }

  comments = addAlertMessage(theCase.id, caseComments, comments);

  return { incident, comments };
};

export const getEntity = (entity: EntityInformation): string =>
  (entity.updatedBy != null
    ? entity.updatedBy.full_name
      ? entity.updatedBy.full_name
      : entity.updatedBy.username
    : entity.createdBy != null
    ? entity.createdBy.full_name
      ? entity.createdBy.full_name
      : entity.createdBy.username
    : '') ?? '';

export const FIELD_INFORMATION = (
  mode: string,
  date: string | undefined,
  user: string | undefined
) => {
  switch (mode) {
    case 'create':
      return i18n.translate('xpack.cases.connectors.cases.externalIncidentCreated', {
        values: { date, user },
        defaultMessage: '(created at {date} by {user})',
      });
    case 'update':
      return i18n.translate('xpack.cases.connectors.cases.externalIncidentUpdated', {
        values: { date, user },
        defaultMessage: '(updated at {date} by {user})',
      });
    case 'add':
      return i18n.translate('xpack.cases.connectors.cases.externalIncidentAdded', {
        values: { date, user },
        defaultMessage: '(added at {date} by {user})',
      });
    default:
      return i18n.translate('xpack.cases.connectors.cases.externalIncidentDefault', {
        values: { date, user },
        defaultMessage: '(created at {date} by {user})',
      });
  }
};

export const transformers: Record<string, Transformer> = {
  informationCreated: ({ value, date, user, ...rest }: TransformerArgs): TransformerArgs => ({
    value: `${value} ${FIELD_INFORMATION('create', date, user)}`,
    ...rest,
  }),
  informationUpdated: ({ value, date, user, ...rest }: TransformerArgs): TransformerArgs => ({
    value: `${value} ${FIELD_INFORMATION('update', date, user)}`,
    ...rest,
  }),
  informationAdded: ({ value, date, user, ...rest }: TransformerArgs): TransformerArgs => ({
    value: `${value} ${FIELD_INFORMATION('add', date, user)}`,
    ...rest,
  }),
  append: ({ value, previousValue, ...rest }: TransformerArgs): TransformerArgs => ({
    value: previousValue ? `${previousValue} \r\n${value}` : `${value}`,
    ...rest,
  }),
};

export const prepareFieldsForTransformation = ({
  defaultPipes,
  mappings,
  params,
}: PrepareFieldsForTransformArgs): PipedField[] =>
  mappings.reduce(
    (acc: PipedField[], mapping) =>
      mapping != null &&
      mapping.target != null &&
      mapping.target !== 'not_mapped' &&
      mapping.action_type !== 'nothing' &&
      mapping.source !== 'comments'
        ? [
            ...acc,
            {
              key: mapping.target,
              value: params[mapping.source] ?? '',
              actionType: mapping.action_type,
              pipes:
                // Do not transform titles
                mapping.source !== 'title'
                  ? mapping.action_type === 'append'
                    ? [...defaultPipes, 'append']
                    : defaultPipes
                  : [],
            },
          ]
        : acc,
    []
  );

export const transformFields = <
  P extends EntityInformation,
  S extends Record<string, unknown>,
  R extends {}
>({
  params,
  fields,
  currentIncident,
}: TransformFieldsArgs<P, S>): R => {
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
  }, {} as R);
};

export const transformComments = (
  comments: CaseResponse['comments'] = [],
  pipes: string[]
): ExternalServiceComment[] =>
  comments.map((c) => ({
    comment: flow(...pipes.map((p) => transformers[p]))({
      value: getCommentContent(c),
      date: c.updated_at ?? c.created_at,
      user: getEntity({
        createdAt: c.created_at,
        createdBy: c.created_by,
        updatedAt: c.updated_at,
        updatedBy: c.updated_by,
      }),
    }).value,
    commentId: c.id,
  }));

export const isCommentAlertType = (
  comment: CommentResponse
): comment is CommentResponseAlertsType => comment.type === CommentType.alert;

export const getCommentContextFromAttributes = (
  attributes: CommentAttributes
): CommentRequestUserType | CommentRequestAlertType | CommentRequestActionsType => {
  const owner = attributes.owner;
  switch (attributes.type) {
    case CommentType.user:
      return {
        type: CommentType.user,
        comment: attributes.comment,
        owner,
      };
    case CommentType.alert:
      return {
        type: attributes.type,
        alertId: attributes.alertId,
        index: attributes.index,
        rule: attributes.rule,
        owner,
      };
    case CommentType.actions:
      return {
        type: attributes.type,
        comment: attributes.comment,
        actions: {
          targets: attributes.actions.targets,
          type: attributes.actions.type,
        },
        owner,
      };
    default:
      return {
        type: CommentType.user,
        comment: '',
        owner,
      };
  }
};
