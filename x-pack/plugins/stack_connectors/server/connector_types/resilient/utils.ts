/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray } from 'lodash';
import { GetValueTextContentResponse, UpdateIncidentRequest } from './types';

export const getValueTextContent = (
  field: string,
  value: string | number | number[]
): GetValueTextContentResponse => {
  if (field === 'description') {
    return {
      textarea: {
        format: 'html',
        content: value.toString(),
      },
    };
  }

  if (field === 'incidentTypes') {
    if (isArray(value)) {
      return { ids: value.map((item) => Number(item)) };
    }
    return {
      ids: [],
    };
  }

  if (field === 'severityCode') {
    return {
      id: Number(value),
    };
  }

  return {
    text: value.toString(),
  };
};

export const formatUpdateRequest = ({
  oldIncident,
  newIncident,
}: {
  oldIncident: Record<string, unknown>;
  newIncident: Record<string, unknown>;
}): UpdateIncidentRequest => {
  return {
    changes: Object.keys(newIncident).map((key) => {
      let name = key;

      if (key === 'incidentTypes') {
        name = 'incident_type_ids';
      }

      if (key === 'severityCode') {
        name = 'severity_code';
      }

      return {
        field: { name },
        old_value: getValueTextContent(
          key,
          name === 'description'
            ? (oldIncident as { description: { content: string } }).description.content
            : (oldIncident[name] as string | number | number[])
        ),
        new_value: getValueTextContent(key, newIncident[key] as string),
      };
    }),
  };
};
