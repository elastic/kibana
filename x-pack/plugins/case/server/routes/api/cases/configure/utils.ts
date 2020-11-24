/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { flow } from 'lodash';
import {
  ConnectorBasicCaseParams,
  ConnectorMappingsAttributes,
  ConnectorTypes,
  EntityInformation,
  ExternalServiceParams,
  ExternalServiceStringParams,
  Incident,
  JiraPushToServiceApiParams,
  MapIncident,
  PipedField,
  PrepareFieldsForTransformArgs,
  PushToServiceApiParams,
  ResilientPushToServiceApiParams,
  ServiceNowPushToServiceApiParams,
  SimpleComment,
  Transformer,
  TransformerArgs,
  TransformFieldsArgs,
} from '../../../../../common/api';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionsClient } from '../../../../../../actions/server/actions_client';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Comment } from '../../../../../../actions/server/builtin_action_types/case/types';

export const mapIncident = async (
  actionsClient: ActionsClient,
  connectorId: string,
  connectorType: string,
  mappings: ConnectorMappingsAttributes[],
  params: ConnectorBasicCaseParams
): Promise<MapIncident> => {
  const { comments: caseComments, externalId } = params;
  const defaultPipes = externalId ? ['informationUpdated'] : ['informationCreated'];
  let currentIncident: ExternalServiceParams | undefined;
  const service = serviceFormatter(connectorType, params);
  if (service == null) {
    throw new Error(`Invalid service`);
  }
  const thirdPartyName = service.thirdPartyName;
  let incident: Partial<PushToServiceApiParams['incident']> = service.incident; // : Incident;
  if (externalId) {
    try {
      currentIncident = ((await actionsClient.execute({
        actionId: connectorId,
        params: {
          subAction: 'getIncident',
          subActionParams: { externalId },
        },
      })) as unknown) as ExternalServiceParams | undefined;
    } catch (ex) {
      throw new Error(
        `Retrieving Incident by id ${externalId} from ${thirdPartyName} failed with exception: ${ex}`
      );
    }
  }

  const deezParams = (params as unknown) as ExternalServiceStringParams;
  const fields = prepareFieldsForTransformation({
    defaultPipes,
    mappings,
    params: deezParams,
  });

  const transformedFields = transformFields<
    ConnectorBasicCaseParams,
    ExternalServiceParams,
    Incident
  >({
    params,
    fields,
    currentIncident,
  });
  incident = { ...incident, ...transformedFields, externalId };
  let comments: SimpleComment[] = [];
  if (caseComments && Array.isArray(caseComments) && caseComments.length > 0) {
    const commentsMapping = mappings.find((m) => m.source === 'comments');
    if (commentsMapping?.action_type !== 'nothing') {
      comments = transformComments(caseComments, ['informationAdded']);
    }
  }
  return { incident, comments };
};

export const serviceFormatter = (
  connectorType: string,
  params: unknown
): { thirdPartyName: string; incident: Partial<PushToServiceApiParams['incident']> } | null => {
  switch (connectorType) {
    case ConnectorTypes.jira:
      const {
        priority,
        labels,
        issueType,
        parent,
      } = params as JiraPushToServiceApiParams['incident'];
      return {
        incident: { priority, labels, issueType, parent },
        thirdPartyName: 'Jira',
      };
    case ConnectorTypes.resilient:
      const { incidentTypes, severityCode } = params as ResilientPushToServiceApiParams['incident'];
      return {
        incident: { incidentTypes, severityCode },
        thirdPartyName: 'Resilient',
      };
    case ConnectorTypes.servicenow:
      const { severity, urgency, impact } = params as ServiceNowPushToServiceApiParams['incident'];
      return {
        incident: { severity, urgency, impact },
        thirdPartyName: 'ServiceNow',
      };
    default:
      return null;
  }
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

export const FIELD_INFORMATION = (
  mode: string,
  date: string | undefined,
  user: string | undefined
) => {
  switch (mode) {
    case 'create':
      return i18n.translate('xpack.actions.builtin.case.common.externalIncidentCreated', {
        values: { date, user },
        defaultMessage: '(created at {date} by {user})',
      });
    case 'update':
      return i18n.translate('xpack.actions.builtin.case.common.externalIncidentUpdated', {
        values: { date, user },
        defaultMessage: '(updated at {date} by {user})',
      });
    case 'add':
      return i18n.translate('xpack.actions.builtin.case.common.externalIncidentAdded', {
        values: { date, user },
        defaultMessage: '(added at {date} by {user})',
      });
    default:
      return i18n.translate('xpack.actions.builtin.case.common.externalIncidentDefault', {
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
const prepareFieldsForTransformation = ({
  defaultPipes,
  mappings,
  params,
}: PrepareFieldsForTransformArgs): PipedField[] =>
  mappings.reduce(
    (acc: PipedField[], mapping) =>
      mapping != null &&
      mapping.target !== 'not_mapped' &&
      mapping.action_type !== 'nothing' &&
      mapping.source !== 'comments'
        ? [
            ...acc,
            {
              key: mapping.target,
              value: params[mapping.source],
              actionType: mapping.action_type,
              pipes: mapping.action_type === 'append' ? [...defaultPipes, 'append'] : defaultPipes,
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

export const transformComments = (comments: Comment[], pipes: string[]): SimpleComment[] =>
  comments.map((c) => ({
    comment: flow(...pipes.map((p) => transformers[p]))({
      value: c.comment,
      date: c.updatedAt ?? c.createdAt,
      user: getEntity(c),
    }).value,
    commentId: c.commentId,
  }));
