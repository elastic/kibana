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
import { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import {
  CreateAnonymizationFieldSchema,
  SearchEsAnonymizationFieldsSchema,
  UpdateAnonymizationFieldSchema,
} from './types';

export const transformESToAnonymizationFields = (
  response: estypes.SearchResponse<SearchEsAnonymizationFieldsSchema>
): AnonymizationFieldResponse[] => {
  return response.hits.hits
    .filter((hit) => hit._source !== undefined)
    .map((hit) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const anonymizationFieldSchema = hit._source!;
      const anonymizationField: AnonymizationFieldResponse = {
        timestamp: anonymizationFieldSchema['@timestamp'],
        createdAt: anonymizationFieldSchema.created_at,
        users:
          anonymizationFieldSchema.users?.map((user) => ({
            id: user.id,
            name: user.name,
          })) ?? [],
        field: anonymizationFieldSchema.field,
        defaultAllow: anonymizationFieldSchema.default_allow,
        defaultAllowReplacement: anonymizationFieldSchema.default_allow_replacement,
        updatedAt: anonymizationFieldSchema.updated_at,
        namespace: anonymizationFieldSchema.namespace,
        id: hit._id,
      };

      return anonymizationField;
    });
};

export const transformToUpdateScheme = (
  user: AuthenticatedUser,
  updatedAt: string,
  { defaultAllow, defaultAllowReplacement, id }: AnonymizationFieldUpdateProps
): UpdateAnonymizationFieldSchema => {
  return {
    id,
    users: [
      {
        id: user.profile_uid,
        name: user.username,
      },
    ],
    updated_at: updatedAt,
    default_allow: defaultAllow,
    default_allow_replacement: defaultAllowReplacement,
  };
};

export const transformToCreateScheme = (
  user: AuthenticatedUser,
  createdAt: string,
  { defaultAllow, defaultAllowReplacement, field }: AnonymizationFieldCreateProps
): CreateAnonymizationFieldSchema => {
  return {
    updated_at: createdAt,
    field,
    users: [
      {
        id: user.profile_uid,
        name: user.username,
      },
    ],
    created_at: createdAt,
    default_allow: defaultAllow,
    default_allow_replacement: defaultAllowReplacement,
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
    if (params.assignEmpty == true || params.containsKey('default_allow')) {
      ctx._source.default_allow = params.default_allow;
    }
    if (params.assignEmpty == true || params.containsKey('default_allow_replacement')) {
      ctx._source.default_allow_replacement = params.default_allow_replacement;
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
