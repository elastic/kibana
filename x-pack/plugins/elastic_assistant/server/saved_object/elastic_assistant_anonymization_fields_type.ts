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
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';

export const assistantAnonymizationFieldsTypeName = 'elastic-ai-assistant-anonymization-fields';

export const assistantAnonymizationFieldsTypeMappings: SavedObjectsType['mappings'] = {
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

export const transformSavedObjectToAssistantAnonymizationField = ({
  savedObject,
}: {
  savedObject: SavedObject<AssistantAnonymizationFieldSoSchema>;
}): AnonymizationFieldResponse => {
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

export interface AssistantAnonymizationFieldSoSchema {
  created_at: string;
  created_by: string;
  field_id: string;
  default_allow?: boolean;
  default_allow_replacement?: boolean;
  updated_at: string;
  updated_by: string;
}

export const assistantAnonymizationFieldsType: SavedObjectsType = {
  name: assistantAnonymizationFieldsTypeName,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX, // todo: generic
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: assistantAnonymizationFieldsTypeMappings,
};

export const transformSavedObjectUpdateToAssistantAnonymizationField = ({
  savedObject,
}: {
  savedObject: SavedObjectsUpdateResponse<AssistantAnonymizationFieldSoSchema>;
}): AnonymizationFieldResponse => {
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

export const transformSavedObjectsToFoundAssistantAnonymizationField = ({
  savedObjectsFindResponse,
}: {
  savedObjectsFindResponse: SavedObjectsFindResponse<AssistantAnonymizationFieldSoSchema>;
}): FindAnonymizationFieldsResponse => {
  return {
    data: savedObjectsFindResponse.saved_objects.map((savedObject) =>
      transformSavedObjectToAssistantAnonymizationField({ savedObject })
    ),
    page: savedObjectsFindResponse.page,
    perPage: savedObjectsFindResponse.per_page,
    total: savedObjectsFindResponse.total,
  };
};
