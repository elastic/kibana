/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConnectorField,
  ConnectorMappingsAttributes,
  ConnectorTypes,
} from '../../../common/api/connectors';
import {
  JiraGetFieldsResponse,
  ResilientGetFieldsResponse,
  ServiceNowGetFieldsResponse,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../actions/server/types';

const normalizeJiraFields = (jiraFields: JiraGetFieldsResponse): ConnectorField[] =>
  Object.keys(jiraFields).reduce<ConnectorField[]>(
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

const normalizeResilientFields = (resilientFields: ResilientGetFieldsResponse): ConnectorField[] =>
  resilientFields.reduce<ConnectorField[]>(
    (acc: ConnectorField[], data) =>
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
const normalizeServiceNowFields = (snFields: ServiceNowGetFieldsResponse): ConnectorField[] =>
  snFields.reduce<ConnectorField[]>(
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

export const formatFields = (theData: unknown, theType: string): ConnectorField[] => {
  switch (theType) {
    case ConnectorTypes.jira:
      return normalizeJiraFields(theData as JiraGetFieldsResponse);
    case ConnectorTypes.resilient:
      return normalizeResilientFields(theData as ResilientGetFieldsResponse);
    case ConnectorTypes.serviceNowITSM:
      return normalizeServiceNowFields(theData as ServiceNowGetFieldsResponse);
    case ConnectorTypes.serviceNowSIR:
      return normalizeServiceNowFields(theData as ServiceNowGetFieldsResponse);
    default:
      return [];
  }
};
const findTextField = (fields: ConnectorField[]): string =>
  (
    fields.find((field: ConnectorField) => field.type === 'text' && field.required) ??
    fields.find((field: ConnectorField) => field.type === 'text')
  )?.id ?? '';
const findTextAreaField = (fields: ConnectorField[]): string =>
  (
    fields.find((field: ConnectorField) => field.type === 'textarea' && field.required) ??
    fields.find((field: ConnectorField) => field.type === 'textarea') ??
    fields.find((field: ConnectorField) => field.type === 'text')
  )?.id ?? '';

const getPreferredFields = (theType: string) => {
  let title: string = '';
  let description: string = '';
  if (theType === ConnectorTypes.jira) {
    title = 'summary';
    description = 'description';
  } else if (theType === ConnectorTypes.resilient) {
    title = 'name';
    description = 'description';
  } else if (
    theType === ConnectorTypes.serviceNowITSM ||
    theType === ConnectorTypes.serviceNowSIR
  ) {
    title = 'short_description';
    description = 'description';
  }

  return { title, description };
};

const getRemainingFields = (fields: ConnectorField[], titleTarget: string) =>
  fields.filter((field: ConnectorField) => field.id !== titleTarget);

const getDynamicFields = (fields: ConnectorField[], dynamicTitle = findTextField(fields)) => {
  const remainingFields = getRemainingFields(fields, dynamicTitle);
  const dynamicDescription = findTextAreaField(remainingFields);
  return {
    description: dynamicDescription,
    title: dynamicTitle,
  };
};

const getField = (fields: ConnectorField[], fieldId: string) =>
  fields.find((field: ConnectorField) => field.id === fieldId);

// if dynamic title is not required and preferred is, true
const shouldTargetBePreferred = (
  fields: ConnectorField[],
  dynamic: string,
  preferred: string
): boolean => {
  if (dynamic !== preferred) {
    const dynamicT = getField(fields, dynamic);
    const preferredT = getField(fields, preferred);
    return preferredT != null && !(dynamicT?.required && !preferredT.required);
  }
  return false;
};
export const createDefaultMapping = (
  fields: ConnectorField[],
  theType: string
): ConnectorMappingsAttributes[] => {
  const { description: dynamicDescription, title: dynamicTitle } = getDynamicFields(fields);
  const { description: preferredDescription, title: preferredTitle } = getPreferredFields(theType);
  let titleTarget = dynamicTitle;
  let descriptionTarget = dynamicDescription;
  if (preferredTitle.length > 0 && preferredDescription.length > 0) {
    if (shouldTargetBePreferred(fields, dynamicTitle, preferredTitle)) {
      const { description: dynamicDescriptionOverwrite } = getDynamicFields(fields, preferredTitle);
      titleTarget = preferredTitle;
      descriptionTarget = dynamicDescriptionOverwrite;
    }
    if (shouldTargetBePreferred(fields, descriptionTarget, preferredDescription)) {
      descriptionTarget = preferredDescription;
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
