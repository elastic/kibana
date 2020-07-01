/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const tagMappings = {
  properties: {
    enabled: {
      type: 'boolean',
    },
    title: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    description: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    key: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    value: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    color: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    createdBy: {
      type: 'keyword',
    },
    updatedBy: {
      type: 'keyword',
    },
    createdAt: {
      type: 'date',
    },
    updatedAt: {
      type: 'date',
    },
  },
};

export const tagAttachmentMappings = {
  properties: {
    tagId: {
      type: 'keyword',
    },
    kid: {
      type: 'keyword',
    },
    createdBy: {
      type: 'keyword',
    },
    createdAt: {
      type: 'date',
    },
  },
};
