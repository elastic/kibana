/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import {
  AnonymizationFieldCreateProps,
  AnonymizationFieldResponse,
  AnonymizationFieldUpdateProps,
} from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { AuthenticatedUser } from '@kbn/core-security-common';
import {
  CreateAnonymizationFieldSchema,
  EsAnonymizationFieldsSchema,
  UpdateAnonymizationFieldSchema,
} from './types';

export const transformESToAnonymizationFields = (
  response: EsAnonymizationFieldsSchema[]
): AnonymizationFieldResponse[] => {
  return response.map((anonymizationFieldSchema) => {
    const anonymizationField: AnonymizationFieldResponse = {
      timestamp: anonymizationFieldSchema['@timestamp'],
      createdAt: anonymizationFieldSchema.created_at,
      field: anonymizationFieldSchema.field,
      allowed: anonymizationFieldSchema.allowed,
      anonymized: anonymizationFieldSchema.anonymized,
      updatedAt: anonymizationFieldSchema.updated_at,
      namespace: anonymizationFieldSchema.namespace,
      id: anonymizationFieldSchema.id,
    };

    return anonymizationField;
  });
};

export const transformESSearchToAnonymizationFields = (
  response: estypes.SearchResponse<EsAnonymizationFieldsSchema>
): AnonymizationFieldResponse[] => {
  return response.hits.hits
    .filter((hit) => hit._source !== undefined)
    .map((hit) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const anonymizationFieldSchema = hit._source!;
      const anonymizationField: AnonymizationFieldResponse = {
        timestamp: anonymizationFieldSchema['@timestamp'],
        createdAt: anonymizationFieldSchema.created_at,
        field: anonymizationFieldSchema.field,
        allowed: anonymizationFieldSchema.allowed,
        anonymized: anonymizationFieldSchema.anonymized,
        updatedAt: anonymizationFieldSchema.updated_at,
        namespace: anonymizationFieldSchema.namespace,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id: hit._id!,
      };

      return anonymizationField;
    });
};

export const transformToUpdateScheme = (
  user: AuthenticatedUser,
  updatedAt: string,
  { allowed, anonymized, id }: AnonymizationFieldUpdateProps
): UpdateAnonymizationFieldSchema => {
  return {
    id,
    updated_at: updatedAt,
    updated_by: user.username,
    allowed,
    anonymized,
  };
};

export const transformToCreateScheme = (
  user: AuthenticatedUser,
  createdAt: string,
  { allowed, anonymized, field }: AnonymizationFieldCreateProps
): CreateAnonymizationFieldSchema => {
  return {
    '@timestamp': createdAt,
    updated_at: createdAt,
    field,
    created_at: createdAt,
    created_by: user.username,
    allowed,
    anonymized,
  };
};

export const getUpdateScript = ({
  anonymizationField,
  isPatch,
}: {
  anonymizationField: UpdateAnonymizationFieldSchema;
  isPatch?: boolean;
}) => {
  return {
    source: `
    if (params.assignEmpty == true || params.containsKey('allowed')) {
      ctx._source.allowed = params.allowed;
    }
    if (params.assignEmpty == true || params.containsKey('anonymized')) {
      ctx._source.anonymized = params.anonymized;
    }
    ctx._source.updated_at = params.updated_at;
  `,
    lang: 'painless',
    params: {
      ...anonymizationField, // when assigning undefined in painless, it will remove property and wil set it to null
      // for patch we don't want to remove unspecified value in payload
      assignEmpty: !(isPatch ?? true),
    },
  };
};
