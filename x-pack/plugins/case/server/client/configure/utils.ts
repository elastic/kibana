/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConnectorMappingsAttributes, ConnectorTypes, Field } from '../../../common/api/connectors';
import {
  JiraGetFieldsResponse,
  ResilientGetFieldsResponse,
  ServiceNowGetFieldsResponse,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../actions/server/types';

export const formatFields = (theData: unknown, theType: string): Field[] => {
  switch (theType) {
    case ConnectorTypes.jira:
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
    case ConnectorTypes.resilient:
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
    case ConnectorTypes.servicenow:
      const snFields = theData as ServiceNowGetFieldsResponse;
      return snFields.reduce<Field[]>(
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
};
export const createDefaultMapping = (
  fields: Field[],
  theType: string
): ConnectorMappingsAttributes[] => {
  let titleTarget =
    (
      fields.find((field: Field) => field.type === 'text' && field.required) ??
      fields.find((field: Field) => field.type === 'text')
    )?.id ?? '';
  let remainingFields = fields.filter((field: Field) => field.id !== titleTarget);
  let descriptionTarget =
    (
      remainingFields.find((field: Field) => field.type === 'textarea' && field.required) ??
      remainingFields.find((field: Field) => field.type === 'textarea') ??
      remainingFields.find((field: Field) => field.type === 'text')
    )?.id ?? '';

  let preferredTitle: string = '';
  let preferredDescription: string = '';
  if (theType === ConnectorTypes.jira) {
    preferredTitle = 'summary';
    preferredDescription = 'description';
  } else if (theType === ConnectorTypes.resilient) {
    preferredTitle = 'name';
    preferredDescription = 'description';
  } else if (theType === ConnectorTypes.servicenow) {
    preferredTitle = 'short_description';
    preferredDescription = 'description';
  }
  if (preferredTitle.length > 0 && preferredDescription.length > 0) {
    if (titleTarget !== preferredTitle) {
      const currentT = fields.find((field: Field) => field.id === titleTarget);
      const preferredT = fields.find((field: Field) => field.id === preferredTitle);
      if (preferredT != null && !(currentT?.required && !preferredT.required)) {
        titleTarget = preferredTitle;
        remainingFields = fields.filter((field: Field) => field.id !== preferredTitle);
        descriptionTarget =
          (
            remainingFields.find((field: Field) => field.type === 'textarea' && field.required) ??
            remainingFields.find((field: Field) => field.type === 'textarea') ??
            remainingFields.find((field: Field) => field.type === 'text')
          )?.id ?? '';
      }
      if (descriptionTarget !== preferredDescription) {
        const currentD = fields.find((field: Field) => field.id === descriptionTarget);
        const preferredD = fields.find((field: Field) => field.id === preferredDescription);
        if (preferredD != null && !(currentD?.required && !preferredD.required)) {
          descriptionTarget = preferredDescription;
        }
      }
    }
  }
  return [
    {
      source: 'title',
      target: titleTarget,
      action_type: 'overwrite',
    },
    {
      source: 'description',
      target: descriptionTarget,
      action_type: 'overwrite',
    },
    {
      source: 'comments',
      target: 'comments',
      action_type: 'append',
    },
  ];
};
