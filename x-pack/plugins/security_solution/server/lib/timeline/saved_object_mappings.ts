/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from '../../../../../../src/core/server';

export const timelineSavedObjectType = 'siem-ui-timeline';

export const timelineSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    columns: {
      properties: {
        aggregatable: {
          type: 'boolean',
        },
        category: {
          type: 'keyword',
        },
        columnHeaderType: {
          type: 'keyword',
        },
        description: {
          type: 'text',
        },
        example: {
          type: 'text',
        },
        indexes: {
          type: 'keyword',
        },
        id: {
          type: 'keyword',
        },
        name: {
          type: 'text',
        },
        placeholder: {
          type: 'text',
        },
        searchable: {
          type: 'boolean',
        },
        type: {
          type: 'keyword',
        },
      },
    },
    dataProviders: {
      properties: {
        id: {
          type: 'keyword',
        },
        name: {
          type: 'text',
        },
        enabled: {
          type: 'boolean',
        },
        excluded: {
          type: 'boolean',
        },
        kqlQuery: {
          type: 'text',
        },
        type: {
          type: 'text',
        },
        queryMatch: {
          properties: {
            field: {
              type: 'text',
            },
            displayField: {
              type: 'text',
            },
            value: {
              type: 'text',
            },
            displayValue: {
              type: 'text',
            },
            operator: {
              type: 'text',
            },
          },
        },
        and: {
          properties: {
            id: {
              type: 'keyword',
            },
            name: {
              type: 'text',
            },
            enabled: {
              type: 'boolean',
            },
            excluded: {
              type: 'boolean',
            },
            kqlQuery: {
              type: 'text',
            },
            type: {
              type: 'text',
            },
            queryMatch: {
              properties: {
                field: {
                  type: 'text',
                },
                displayField: {
                  type: 'text',
                },
                value: {
                  type: 'text',
                },
                displayValue: {
                  type: 'text',
                },
                operator: {
                  type: 'text',
                },
              },
            },
          },
        },
      },
    },
    description: {
      type: 'text',
    },
    eventType: {
      type: 'keyword',
    },
    excludedRowRendererIds: {
      type: 'text',
    },
    favorite: {
      properties: {
        keySearch: {
          type: 'text',
        },
        fullName: {
          type: 'text',
        },
        userName: {
          type: 'text',
        },
        favoriteDate: {
          type: 'date',
        },
      },
    },
    filters: {
      properties: {
        meta: {
          properties: {
            alias: {
              type: 'text',
            },
            controlledBy: {
              type: 'text',
            },
            disabled: {
              type: 'boolean',
            },
            field: {
              type: 'text',
            },
            formattedValue: {
              type: 'text',
            },
            index: {
              type: 'keyword',
            },
            key: {
              type: 'keyword',
            },
            negate: {
              type: 'boolean',
            },
            params: {
              type: 'text',
            },
            type: {
              type: 'keyword',
            },
            value: {
              type: 'text',
            },
          },
        },
        exists: {
          type: 'text',
        },
        match_all: {
          type: 'text',
        },
        missing: {
          type: 'text',
        },
        query: {
          type: 'text',
        },
        range: {
          type: 'text',
        },
        script: {
          type: 'text',
        },
      },
    },
    kqlMode: {
      type: 'keyword',
    },
    kqlQuery: {
      properties: {
        filterQuery: {
          properties: {
            kuery: {
              properties: {
                kind: {
                  type: 'keyword',
                },
                expression: {
                  type: 'text',
                },
              },
            },
            serializedQuery: {
              type: 'text',
            },
          },
        },
      },
    },
    title: {
      type: 'text',
    },
    templateTimelineId: {
      type: 'text',
    },
    templateTimelineVersion: {
      type: 'integer',
    },
    timelineType: {
      type: 'keyword',
    },
    dateRange: {
      properties: {
        start: {
          type: 'date',
        },
        end: {
          type: 'date',
        },
      },
    },
    savedQueryId: {
      type: 'keyword',
    },
    sort: {
      properties: {
        columnId: {
          type: 'keyword',
        },
        sortDirection: {
          type: 'keyword',
        },
      },
    },
    status: {
      type: 'keyword',
    },
    created: {
      type: 'date',
    },
    createdBy: {
      type: 'text',
    },
    updated: {
      type: 'date',
    },
    updatedBy: {
      type: 'text',
    },
  },
};

export const type: SavedObjectsType = {
  name: timelineSavedObjectType,
  hidden: false,
  namespaceType: 'single',
  mappings: timelineSavedObjectMappings,
};
