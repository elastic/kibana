/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { flow } from 'lodash';
import {
  ConnectorMappingsAttributes,
  ConnectorTypes,
  EntityInformation,
  ExternalServiceParams,
  Incident,
  PipedField,
  PrepareFieldsForTransformArgs,
  PushToServiceApiParams,
  Transformer,
  TransformerArgs,
  TransformFieldsArgs,
} from '../../../../../common/api';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionsClient } from '../../../../../../actions/server/actions_client';

export const mapFields = async (
  actionsClient: ActionsClient,
  connectorId: string,
  connectorType: string,
  mappings: ConnectorMappingsAttributes[],
  params: PushToServiceApiParams
) => {
  console.log(
    'mapFields',
    JSON.stringify({
      connectorId,
      connectorType,
      mappings,
      params,
    })
  );
  const { externalId } = params;
  const defaultPipes = externalId ? ['informationUpdated'] : ['informationCreated'];
  let currentIncident: ExternalServiceParams | undefined;
  let thirdPartyName;
  if (connectorType === ConnectorTypes.jira) {
    thirdPartyName = 'Jira';
  } else if (connectorType === ConnectorTypes.resilient) {
    thirdPartyName = 'Resilient';
  } else if (connectorType === ConnectorTypes.servicenow) {
    thirdPartyName = 'ServiceNow';
  }
  if (externalId) {
    try {
      currentIncident = ((await actionsClient.execute({
        actionId: connectorId,
        params: {
          subAction: 'getIncident',
          subActionParams: params,
        },
      })) as unknown) as ExternalServiceParams | undefined;
    } catch (ex) {
      throw new Error(
        `Retrieving Incident by id ${externalId} from ${thirdPartyName} failed with exception: ${ex}`
      );
    }
  }

  let incident; // : Incident;
  if (mappings) {
    const fields = prepareFieldsForTransformation({
      externalCase: params.externalObject,
      mappings,
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
    console.log('INCIDENT FIELDS', JSON.stringify({ fields, transformedFields }));
    incident = { fields, transformedFields };
  }
  return incident;
  //   const { priority, labels, issueType, parent } = params;
  //   incident = {
  //     summary: transformedFields.summary,
  //     description: transformedFields.description,
  //     priority,
  //     labels,
  //     issueType,
  //     parent,
  //   };
  // } else {
  //   const { title, description, priority, labels, issueType, parent } = params;
  //   incident = { summary: title, description, priority, labels, issueType, parent };
  // }
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

export const prepareFieldsForTransformation = ({
  externalCase,
  mappings,
  defaultPipes = ['informationCreated'],
}: PrepareFieldsForTransformArgs): PipedField[] => {
  console.log(
    'prepareFieldsForTransformation',
    JSON.stringify({
      externalCase,
      mappings,
      defaultPipes,
    })
  );
  return [];
  // return Object.keys(externalCase)
  //   .filter(
  //     (p) => mappings.get(p)?.action_type != null && mappings.get(p)?.action_type !== 'nothing'
  //   )
  //   .map((p) => {
  //     const action_type = mappings.get(p)?.action_type ?? 'nothing';
  //     return {
  //       key: p,
  //       value: externalCase[p],
  //       actionType: action_type,
  //       pipes: action_type === 'append' ? [...defaultPipes, 'append'] : defaultPipes,
  //     };
  //   });
};
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
