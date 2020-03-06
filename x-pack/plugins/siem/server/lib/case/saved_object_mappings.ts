/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Temporary file to write mappings for case
// while Saved Object Mappings API is programmed for the NP
// See: https://github.com/elastic/kibana/issues/50309

export const caseSavedObjectType = 'case-workflow';
export const caseCommentSavedObjectType = 'case-workflow-comment';

export const caseSavedObjectMappings = {
  properties: {
    created_at: {
      type: 'date',
    },
    description: {
      type: 'text',
    },
    title: {
      type: 'keyword',
    },
    created_by: {
      properties: {
        username: {
          type: 'keyword',
        },
        full_name: {
          type: 'keyword',
        },
      },
    },
    state: {
      type: 'keyword',
    },
    tags: {
      type: 'keyword',
    },
    updated_at: {
      type: 'date',
    },
  },
};

export const caseCommentSavedObjectMappings = {
  properties: {
    comment: {
      type: 'text',
    },
    created_at: {
      type: 'date',
    },
    created_by: {
      properties: {
        full_name: {
          type: 'keyword',
        },
        username: {
          type: 'keyword',
        },
      },
    },
    updated_at: {
      type: 'date',
    },
  },
};
