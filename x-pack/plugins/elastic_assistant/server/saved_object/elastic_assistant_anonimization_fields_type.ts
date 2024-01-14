/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type {
  SavedObject,
  SavedObjectsFindResponse,
  SavedObjectsType,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import { AnonimizationFieldResponse } from '../schemas/anonimization_fields/bulk_crud_anonimization_fields_route.gen';
import { FindAnonimizationFieldsResponse } from '../schemas/anonimization_fields/find_prompts_route.gen';

export const assistantAnonimizationFieldsTypeName = 'elastic-ai-assistant-anonimization-fields';

export const assistantAnonimizationFieldsTypeMappings: SavedObjectsType['mappings'] = {
  properties: {
    id: {
      type: 'keyword',
    },
    field_id: {
      type: 'keyword',
    },
    default_allow: {
      type: 'boolean',
    },
    default_allow_replacement: {
      type: 'boolean',
    },
    updated_at: {
      type: 'keyword',
    },
    updated_by: {
      type: 'keyword',
    },
    created_at: {
      type: 'keyword',
    },
    created_by: {
      type: 'keyword',
    },
  },
};

export const transformSavedObjectToAssistantAnonimizationField = ({
  savedObject,
}: {
  savedObject: SavedObject<AssistantAnonimizationFieldSoSchema>;
}): AnonimizationFieldResponse => {
  const {
    version: _version,
    attributes: {
      /* eslint-disable @typescript-eslint/naming-convention */
      created_at,
      created_by,
      field_id,
      default_allow,
      default_allow_replacement,
      updated_by,
      updated_at,
      /* eslint-enable @typescript-eslint/naming-convention */
    },
    id,
  } = savedObject;

  return {
    createdAt: created_at,
    createdBy: created_by,
    fieldId: field_id,
    defaultAllow: default_allow,
    defaultAllowReplacement: default_allow_replacement,
    updatedAt: updated_at,
    updatedBy: updated_by,
    id,
  };
};

export interface AssistantAnonimizationFieldSoSchema {
  created_at: string;
  created_by: string;
  field_id: string;
  default_allow?: boolean;
  default_allow_replacement?: boolean;
  updated_at: string;
  updated_by: string;
}

export const assistantAnonimizationFieldsType: SavedObjectsType = {
  name: assistantAnonimizationFieldsTypeName,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX, // todo: generic
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: assistantAnonimizationFieldsTypeMappings,
};

export const transformSavedObjectUpdateToAssistantAnonimizationField = ({
  savedObject,
}: {
  savedObject: SavedObjectsUpdateResponse<AssistantAnonimizationFieldSoSchema>;
}): AnonimizationFieldResponse => {
  const dateNow = new Date().toISOString();
  const {
    version: _version,
    attributes: {
      updated_by: updatedBy,
      default_allow: defaultAllow,
      default_allow_replacement: defaultAllowReplacement,
      created_at: createdAt,
      created_by: createdBy,
      field_id: fieldId,
    },
    id,
    updated_at: updatedAt,
  } = savedObject;

  return {
    createdAt,
    createdBy,
    fieldId: fieldId ?? '',
    id,
    defaultAllow,
    defaultAllowReplacement,
    updatedAt: updatedAt ?? dateNow,
    updatedBy,
  };
};

export const transformSavedObjectsToFoundAssistantAnonimizationField = ({
  savedObjectsFindResponse,
}: {
  savedObjectsFindResponse: SavedObjectsFindResponse<AssistantAnonimizationFieldSoSchema>;
}): FindAnonimizationFieldsResponse => {
  return {
    data: savedObjectsFindResponse.saved_objects.map((savedObject) =>
      transformSavedObjectToAssistantAnonimizationField({ savedObject })
    ),
    page: savedObjectsFindResponse.page,
    perPage: savedObjectsFindResponse.per_page,
    total: savedObjectsFindResponse.total,
  };
};
