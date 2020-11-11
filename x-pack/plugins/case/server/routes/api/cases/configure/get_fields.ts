/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import Boom from '@hapi/boom';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';

import {
  CASE_CONFIGURE_CONNECTOR_DETAILS_URL,
  JIRA_ACTION_TYPE_ID,
  RESILIENT_ACTION_TYPE_ID,
  SERVICENOW_ACTION_TYPE_ID,
} from '../../../../../common/constants';
import {
  JiraGetFieldsResponse,
  ResilientGetFieldsResponse,
  ServiceNowGetFieldsResponse,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../actions/server/types';

export function initCaseConfigureGetFields({ router }: RouteDeps) {
  router.get(
    {
      path: CASE_CONFIGURE_CONNECTOR_DETAILS_URL,
      validate: {
        params: schema.object({
          connector_id: schema.string(),
        }),
        query: schema.object({
          connectorType: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const connectorType = request.query.connectorType as ConnectorType;

        if (connectorType == null) {
          throw Boom.illegal('no connectorType value provided');
        }
        const actionsClient = await context.actions?.getActionsClient();

        if (actionsClient == null) {
          throw Boom.notFound('Action client have not been found');
        }
        let results = await actionsClient.execute({
          actionId: request.params.connector_id,
          params: {
            subAction: 'getFields',
            subActionParams: {},
          },
        });
        if (connectorType === '.jira') {
          results = results as JiraResponse;
        } else if (connectorType === '.resilient') {
          results = results as ResilientResponse;
        } else if (connectorType === '.servicenow') {
          results = results as ServiceNowResponse;
        }
        return response.ok({ body: formatData({ theData: results.data, theType: connectorType }) });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
interface JiraResponse {
  actionId: string;
  data: JiraGetFieldsResponse;
  status: 'ok' | 'error';
}
interface ResilientResponse {
  actionId: string;
  data: ResilientGetFieldsResponse;
  status: 'ok' | 'error';
}
interface ServiceNowResponse {
  actionId: string;
  data: ServiceNowGetFieldsResponse;
  status: 'ok' | 'error';
}
interface RequestResponse {
  actionId: string;
  data: GetFieldsResponse;
  status: 'ok' | 'error';
}
type GetFieldsResponse =
  | JiraGetFieldsResponse
  | ResilientGetFieldsResponse
  | ServiceNowGetFieldsResponse;
type FieldType = 'text' | 'textarea';
type ThirdPartyFields =
  | {
      theData: ServiceNowGetFieldsResponse;
      theType: '.servicenow';
    }
  | {
      theData: JiraGetFieldsResponse;
      theType: '.jira';
    }
  | {
      theData: ResilientGetFieldsResponse;
      theType: '.resilient';
    };
type ConnectorType = '.jira' | '.resilient' | '.servicenow';
export interface Field {
  id: string;
  name: string;
  required: boolean;
  type: FieldType;
}

function formatData({ theData, theType }: ThirdPartyFields) {
  switch (theType) {
    case JIRA_ACTION_TYPE_ID:
      const jiraFields = theData as JiraGetFieldsResponse;
      return Object.keys(jiraFields).reduce<Field[]>(
        (acc, data) =>
          jiraFields[data].schema.type === 'string'
            ? [
                ...acc,
                {
                  id: data,
                  name: jiraFields[data].name,
                  required: jiraFields[data].required,
                  type: 'text',
                },
              ]
            : acc,
        []
      );
    case RESILIENT_ACTION_TYPE_ID:
      const resilientFields = theData as ResilientGetFieldsResponse;
      return resilientFields.reduce<Field[]>(
        (acc, data) =>
          (data.input_type === 'textarea' || data.input_type === 'text') && !data.read_only
            ? [
                ...acc,
                {
                  id: data.name,
                  name: data.text,
                  required: data.required === 'always',
                  type: data.input_type,
                },
              ]
            : acc,
        []
      );
    case SERVICENOW_ACTION_TYPE_ID:
      const snFields = theData as ServiceNowGetFieldsResponse;
      return snFields.map<Field>((data) => ({
        id: data.element,
        name: data.column_label,
        required: data.mandatory === 'true',
        type: parseFloat(data.max_length) > 160 ? 'textarea' : 'text',
      }));
    default:
      return [];
  }
}
