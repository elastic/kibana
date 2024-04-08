/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExternalServiceParams, GetValueTextContentResponse, UpdateIncidentRequest } from './types';

export const getValueTextContent = (
  field: string,
  value: string | number | number[]
): GetValueTextContentResponse => {
  if (field === 'description') {
    return {
      textarea: {
        format: 'html',
        content: value as string,
      },
    };
  }

  if (field === 'incidentTypes') {
    return {
      ids: value as number[],
    };
  }

  if (field === 'severityCode') {
    return {
      id: value as number,
    };
  }

  return {
    text: value as string,
  };
};

export const formatUpdateRequest = ({
  oldIncident,
  newIncident,
}: ExternalServiceParams): UpdateIncidentRequest => {
  return {
    changes: Object.keys(newIncident as Record<string, unknown>).map((key) => {
      let name = key;

      if (key === 'incidentTypes') {
        name = 'incident_type_ids';
      }

      if (key === 'severityCode') {
        name = 'severity_code';
      }

      return {
        field: { name },
        // TODO: Fix ugly casting
        old_value: getValueTextContent(
          key,
          (oldIncident as Record<string, unknown>)[name] as string
        ),
        new_value: getValueTextContent(
          key,
          (newIncident as Record<string, unknown>)[key] as string
        ),
      };
    }),
  };
};
