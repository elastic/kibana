/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import {
  exceptionListAgnosticSavedObjectType,
  exceptionListSavedObjectType,
} from '@kbn/securitysolution-list-utils';

import { migrations } from './migrations';

/**
 * This is a super set of exception list and exception list items. The switch
 * to determine if you are using an exception list vs. an exception list item
 * is "list_type". If "list_type" is "list" then it is an exception list. If
 * "list_type" is "item" then the type is an item.
 */
export const commonMapping: SavedObjectsType['mappings'] = {
  properties: {
    _tags: {
      type: 'keyword',
    },
    created_at: {
      type: 'keyword',
    },
    created_by: {
      type: 'keyword',
    },
    description: {
      type: 'keyword',
    },
    immutable: {
      type: 'boolean',
    },
    list_id: {
      type: 'keyword',
    },
    list_type: {
      type: 'keyword',
    },
    meta: {
      type: 'keyword',
    },
    name: {
      fields: {
        text: {
          type: 'text',
        },
      },
      type: 'keyword',
    },
    tags: {
      fields: {
        text: {
          type: 'text',
        },
      },
      type: 'keyword',
    },
    tie_breaker_id: {
      type: 'keyword',
    },
    type: {
      type: 'keyword',
    },
    updated_by: {
      type: 'keyword',
    },
    version: {
      type: 'keyword',
    },
  },
};

export const exceptionListMapping: SavedObjectsType['mappings'] = {
  properties: {
    // There is nothing that is not also used within exceptionListItemMapping
    // at this time but if there is it should go here
  },
};

export const exceptionListItemMapping: SavedObjectsType['mappings'] = {
  properties: {
    comments: {
      properties: {
        comment: {
          type: 'keyword',
        },
        created_at: {
          type: 'keyword',
        },
        created_by: {
          type: 'keyword',
        },
        id: {
          type: 'keyword',
        },
        updated_at: {
          type: 'keyword',
        },
        updated_by: {
          type: 'keyword',
        },
      },
    },
    entries: {
      properties: {
        entries: {
          properties: {
            field: {
              type: 'keyword',
            },
            operator: {
              type: 'keyword',
            },
            type: {
              type: 'keyword',
            },
            value: {
              fields: {
                text: {
                  type: 'text',
                },
              },
              type: 'keyword',
            },
          },
        },
        field: {
          type: 'keyword',
        },
        list: {
          properties: {
            id: {
              type: 'keyword',
            },
            type: {
              type: 'keyword',
            },
          },
        },
        operator: {
          type: 'keyword',
        },
        type: {
          type: 'keyword',
        },
        value: {
          fields: {
            text: {
              type: 'text',
            },
          },
          type: 'keyword',
        },
      },
    },
    item_id: {
      type: 'keyword',
    },
    os_types: {
      type: 'keyword',
    },
  },
};

const combinedMappings: SavedObjectsType['mappings'] = {
  properties: {
    ...commonMapping.properties,
    ...exceptionListMapping.properties,
    ...exceptionListItemMapping.properties,
  },
};

export const exceptionListType: SavedObjectsType = {
  convertToMultiNamespaceTypeVersion: '8.0.0',
  hidden: false,
  mappings: combinedMappings,
  migrations,
  name: exceptionListSavedObjectType,
  namespaceType: 'multiple-isolated',
};

export const exceptionListAgnosticType: SavedObjectsType = {
  hidden: false,
  mappings: combinedMappings,
  migrations,
  name: exceptionListAgnosticSavedObjectType,
  namespaceType: 'agnostic',
};
