/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  JiraGetFieldsResponse,
  ResilientGetFieldsResponse,
  ServiceNowGetFieldsResponse,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../actions/server/types';

import { ConnectorTypes, FieldResponse } from '../../../common/api';
import { ConfigureFields } from '../types';

export const getFields = () => async ({
  actionsClient,
  connectorType,
  connectorId,
}: ConfigureFields): Promise<FieldResponse> => {
  const results = await actionsClient.execute({
    actionId: connectorId,
    params: {
      subAction: 'getFields',
      subActionParams: {},
    },
  });

  return formatData({ theData: results.data, theType: connectorType });
};

interface ThirdPartyFields {
  theData: unknown;
  theType: string;
}

function formatData({ theData, theType }: ThirdPartyFields) {
  switch (theType) {
    case ConnectorTypes.jira:
      const jiraFields = theData as JiraGetFieldsResponse;
      return Object.keys(jiraFields).reduce<FieldResponse>(
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
    case ConnectorTypes.resilient:
      const resilientFields = theData as ResilientGetFieldsResponse;
      return resilientFields.reduce<FieldResponse>(
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
    case ConnectorTypes.servicenow:
      const snFields = theData as ServiceNowGetFieldsResponse;
      return snFields.reduce<FieldResponse>(
        (acc, data) => [
          ...acc,
          {
            id: data.element,
            name: data.column_label,
            required: data.mandatory === 'true',
            type: parseFloat(data.max_length) > 160 ? 'textarea' : 'text',
          },
        ],
        []
      );
    default:
      return [];
  }
}
