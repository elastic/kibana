/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVENT_ACTION,
  ACTIONS_PROVIDER,
  KIBANA_ALERTING_OUTCOME,
  ALERTING_PROVIDER,
  EVENT_DURATION,
  ERROR_MESSAGE,
  ES_SEARCH_DURATION_FIELD,
  EXECUTION_UUID_FIELD,
  MESSAGE_FIELD,
  NUMBER_OF_ACTIVE_ALERTS_FIELD,
  NUMBER_OF_GENERATED_ACTIONS_FIELD,
  NUMBER_OF_NEW_ALERTS_FIELD,
  NUMBER_OF_RECOVERED_ALERTS_FIELD,
  NUMBER_OF_TRIGGERED_ACTIONS_FIELD,
  OUTCOME_FIELD,
  PROVIDER_FIELD,
  RULE_ID_FIELD,
  RULE_NAME_FIELD,
  SCHEDULE_DELAY_FIELD,
  SPACE_ID_FIELD,
  START_FIELD,
  TIMESTAMP,
  TOTAL_SEARCH_DURATION_FIELD,
  VERSION_FIELD,
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
    runtime_mappings: {
      message_keyword: {
        type: 'keyword',
        script: {
          source: 'emit(params._source.message)',
        },
      },
      error_message_keyword: {
        type: 'keyword',
        script: {
          source: "if (doc['event.outcome'] === 'failure') { emit(params._source.error.message) }",
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
      [`${START_FIELD}.min`]: {
        min: {
          field: START_FIELD,
        },
      },
      [`${SCHEDULE_DELAY_FIELD}.max`]: {
        max: {
          field: SCHEDULE_DELAY_FIELD,
        },
      },
      [`${TOTAL_SEARCH_DURATION_FIELD}.max`]: {
        max: {
          field: TOTAL_SEARCH_DURATION_FIELD,
        },
      },
      [`${ES_SEARCH_DURATION_FIELD}.max`]: {
        max: {
          field: ES_SEARCH_DURATION_FIELD,
        },
      },
      [`${NUMBER_OF_TRIGGERED_ACTIONS_FIELD}.max`]: {
        max: {
          field: NUMBER_OF_TRIGGERED_ACTIONS_FIELD,
        },
      },
      [`${NUMBER_OF_GENERATED_ACTIONS_FIELD}.max`]: {
        max: {
          field: NUMBER_OF_GENERATED_ACTIONS_FIELD,
        },
      },
      [`${NUMBER_OF_ACTIVE_ALERTS_FIELD}.max`]: {
        max: {
          field: NUMBER_OF_ACTIVE_ALERTS_FIELD,
        },
      },
      [`${NUMBER_OF_RECOVERED_ALERTS_FIELD}.max`]: {
        max: {
          field: NUMBER_OF_RECOVERED_ALERTS_FIELD,
        },
      },
      [`${NUMBER_OF_NEW_ALERTS_FIELD}.max`]: {
        max: {
          field: NUMBER_OF_NEW_ALERTS_FIELD,
        },
      },
      [`${EVENT_DURATION}.max`]: {
        max: {
          field: EVENT_DURATION,
        },
      },
      rule: {
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
          data: {
            terms: {
              field: PROVIDER_FIELD,
              size: 1,
            },
            aggs: {
              rule_data: {
                top_metrics: {
                  metrics: [
                    {
                      field: KIBANA_ALERTING_OUTCOME,
                    },
                    {
                      field: VERSION_FIELD,
                    },
                    {
                      field: RULE_ID_FIELD,
                    },
                    {
                      field: RULE_NAME_FIELD,
                    },
                    {
                      field: SPACE_ID_FIELD,
                    },
                    {
                      field: 'kibana.alert.rule.consumer',
                    },
                    {
                      field: 'kibana.alert.rule.rule_type_id',
                    },
                  ],
                  sort: {
                    [START_FIELD]: 'desc',
                  },
                },
              },
            },
          },
          [MESSAGE_FIELD]: {
            terms: {
              field: 'message_keyword',
              size: 1,
            },
          },
          [ERROR_MESSAGE]: {
            terms: {
              field: 'error_message_keyword',
              size: 1,
            },
          },
        },
      },
      'actions.event.outcome': {
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
          actionOutcomes: {
            terms: {
              field: OUTCOME_FIELD,
            },
          },
        },
      },
      'alerting.event.outcome': {
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
          [OUTCOME_FIELD]: {
            terms: {
              field: OUTCOME_FIELD,
              size: 10,
            },
            aggs: {
              [KIBANA_ALERTING_OUTCOME]: {
                top_metrics: {
                  metrics: [
                    {
                      field: KIBANA_ALERTING_OUTCOME,
                    },
                  ],
                  sort: {
                    [START_FIELD]: 'desc',
                  },
                },
              },
            },
          },
          [MESSAGE_FIELD]: {
            terms: {
              field: 'message_keyword',
            },
          },
          [ERROR_MESSAGE]: {
            terms: {
              field: 'error_message_keyword',
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
