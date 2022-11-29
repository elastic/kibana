/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVENT_ACTION,
  ACTIONS_PROVIDER,
  ALERTING_PROVIDER,
  EXECUTION_UUID_FIELD,
  OUTCOME_FIELD,
  PROVIDER_FIELD,
  TIMESTAMP,
} from '../constants/event_log_fields';
import { DESTINATION_INDEX } from './install_transform';

const SOURCE_INDEX = '.kibana-event-log*';

export const eventLogTransform = () => ({
  source: {
    index: SOURCE_INDEX,
    query: {
      bool: {
        // limit query to only alerting and actions
        must: {
          bool: {
            should: [
              {
                term: {
                  [PROVIDER_FIELD]: ALERTING_PROVIDER,
                },
              },
              {
                term: {
                  [PROVIDER_FIELD]: ACTIONS_PROVIDER,
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        // exclude execute-start documents
        must_not: {
          bool: {
            should: [
              {
                term: {
                  [EVENT_ACTION]: 'execute-start',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      },
    },
  },
  dest: {
    index: DESTINATION_INDEX,
  },
  pivot: {
    group_by: {
      [EXECUTION_UUID_FIELD]: {
        terms: {
          field: EXECUTION_UUID_FIELD,
        },
      },
    },
    aggregations: {
      [`${TIMESTAMP}.min`]: {
        min: {
          field: TIMESTAMP,
        },
      },
      alerting: {
        filter: {
          bool: {
            must: [
              {
                match: {
                  [EVENT_ACTION]: 'execute',
                },
              },
              {
                match: {
                  [PROVIDER_FIELD]: ALERTING_PROVIDER,
                },
              },
            ],
          },
        },
        aggs: {
          doc: {
            scripted_metric: {
              init_script: `state.last_doc = new HashMap()`,
              map_script: `state.last_doc = new HashMap(params['_source']);`,
              combine_script: 'return state',
              reduce_script: `
                def last_doc = new HashMap();
                for (state in states) {
                  last_doc = state.last_doc;
                }
                return last_doc;
              `,
            },
          },
        },
      },
      actions: {
        filter: {
          bool: {
            must: [
              {
                match: {
                  [EVENT_ACTION]: 'execute',
                },
              },
              {
                match: {
                  [PROVIDER_FIELD]: ACTIONS_PROVIDER,
                },
              },
            ],
          },
        },
        aggs: {
          doc: {
            scripted_metric: {
              init_script: `state.all_docs = []`,
              map_script: `state.all_docs.add(new HashMap(params['_source']));`,
              combine_script: 'return state',
              reduce_script: `
                def all_docs = [];
                for (state in states) {
                  for (doc in state.all_docs) {
                    all_docs.add(doc);
                  }
                }
                return all_docs;
              `,
            },
          },
          outcomes: {
            terms: {
              field: OUTCOME_FIELD,
            },
          },
        },
      },
      'alerting.timeout': {
        filter: {
          bool: {
            must: [
              {
                match: {
                  [EVENT_ACTION]: 'execute-timeout',
                },
              },
              {
                match: {
                  [PROVIDER_FIELD]: ALERTING_PROVIDER,
                },
              },
            ],
          },
        },
      },
    },
  },
});
