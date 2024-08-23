/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import type { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';

export const EXTERNAL_RULE_SOURCE_SO_TYPE = 'external-rule-source';

export interface ExternalRuleSourceSOAttributes {
  github: {
    owner: string;
    repo: string;
    token: string;
  };
}

const mappings: SavedObjectsType['mappings'] = {
  properties: {
    github: {
      type: 'object',
      properties: {
        owner: {
          type: 'keyword',
        },
        repo: {
          type: 'keyword',
        },
        token: {
          type: 'binary',
        },
      },
    },
  },
};

export const externalRuleSourceSOType: SavedObjectsType = {
  name: EXTERNAL_RULE_SOURCE_SO_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'agnostic',
  mappings,
};

export const externalRuleSourceEncryptedSOType: EncryptedSavedObjectTypeRegistration = {
  type: EXTERNAL_RULE_SOURCE_SO_TYPE,
  attributesToEncrypt: new Set(['github.token']),
};
