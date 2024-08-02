/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateDurationV1, validateHoursV1, validateTimezoneV1 } from '../../../validation';
import { notifyWhenSchemaV1, alertDelaySchemaV1 } from '../../../response';
import { alertsFilterQuerySchemaV1 } from '../../../../alerts_filter_query';

export const actionFrequencySchema = schema.object({
  summary: schema.boolean({
    meta: { description: 'Indicates whether the action is a summary.' },
  }),
  notify_when: notifyWhenSchemaV1,
  throttle: schema.nullable(
    schema.string({
      validate: validateDurationV1,
      meta: {
        description:
          'The throttle interval, which defines how often an alert generates repeated actions. It is specified in seconds, minutes, hours, or days and is applicable only if `notify_when` is set to `onThrottleInterval`. NOTE: You cannot specify the throttle interval at both the rule and action level. The recommended method is to set it for each action. If you set it at the rule level then update the rule in Kibana, it is automatically changed to use action-specific values.',
      },
    })
  ),
});

export const actionAlertsFilterSchema = schema.object({
  query: schema.maybe(alertsFilterQuerySchemaV1),
  timeframe: schema.maybe(
    schema.object(
      {
        days: schema.arrayOf(
          schema.oneOf([
            schema.literal(1),
            schema.literal(2),
            schema.literal(3),
            schema.literal(4),
            schema.literal(5),
            schema.literal(6),
            schema.literal(7),
          ]),
          {
            meta: {
              description:
                'Defines the days of the week that the action can run, represented as an array of numbers. For example, `1` represents Monday. An empty array is equivalent to specifying all the days of the week.',
            },
          }
        ),
        hours: schema.object(
          {
            start: schema.string({
              validate: validateHoursV1,
              meta: { description: 'The start of the time frame in 24-hour notation (`hh:mm`).' },
            }),
            end: schema.string({
              validate: validateHoursV1,
              meta: { description: 'The end of the time frame in 24-hour notation (`hh:mm`).' },
            }),
          },
          {
            meta: {
              description:
                'Defines the range of time in a day that the action can run. If the `start` value is `00:00` and the `end` value is `24:00`, actions be generated all day.',
            },
          }
        ),
        timezone: schema.string({
          validate: validateTimezoneV1,
          meta: {
            description:
              'The ISO time zone for the `hours` values. Values such as `UTC` and `UTC+1` also work but lack built-in daylight savings time support and are not recommended.',
          },
        }),
      },
      { meta: { description: 'Defines a period that limits whether the action runs.' } }
    )
  ),
});

export const actionSchema = schema.object(
  {
    group: schema.maybe(
      schema.string({
        meta: {
          description:
            "The group name, which affects when the action runs (for example, when the threshold is met or when the alert is recovered). Each rule type has a list of valid action group names. If you don't need to group actions, set to `default`.",
        },
      })
    ),
    id: schema.string({
      meta: { description: 'The identifier for the connector saved object.' },
    }),
    params: schema.recordOf(schema.string(), schema.any(), {
      defaultValue: {},
      meta: {
        description:
          'The parameters for the action, which are sent to the connector. The `params` are handled as Mustache templates and passed a default set of context.',
      },
    }),
    frequency: schema.maybe(actionFrequencySchema),
    uuid: schema.maybe(
      schema.string({
        meta: { description: 'A universally unique identifier (UUID) for the action.' },
      })
    ),
    alerts_filter: schema.maybe(actionAlertsFilterSchema),
    use_alert_data_for_template: schema.maybe(
      schema.boolean({
        meta: {
          description: 'Indicates whether to use alert data as a template.',
        },
      })
    ),
  },
  {
    meta: { description: 'An action that runs under defined conditions.' },
  }
);

export const updateBodySchema = schema.object({
  name: schema.string({
    meta: {
      description:
        'The name of the rule. While this name does not have to be unique, a distinctive name can help you identify a rule.',
    },
  }),
  tags: schema.arrayOf(
    schema.string({
      meta: {
        description: 'The tags for the rule.',
      },
    }),
    { defaultValue: [] }
  ),
  schedule: schema.object({
    interval: schema.string({
      validate: validateDurationV1,
      meta: { description: 'The interval is specified in seconds, minutes, hours, or days.' },
    }),
  }),
  throttle: schema.maybe(
    schema.nullable(
      schema.string({
        validate: validateDurationV1,
        meta: {
          description:
            'Use the `throttle` property in the action `frequency` object instead. The throttle interval, which defines how often an alert generates repeated actions. NOTE: You cannot specify the throttle interval at both the rule and action level. If you set it at the rule level then update the rule in Kibana, it is automatically changed to use action-specific values.',
        },
      })
    )
  ),
  params: schema.recordOf(schema.string(), schema.any(), {
    defaultValue: {},
    meta: { description: 'The parameters for the rule.' },
  }),
  actions: schema.arrayOf(actionSchema, { defaultValue: [] }),
  notify_when: schema.maybe(schema.nullable(notifyWhenSchemaV1)),
  alert_delay: schema.maybe(alertDelaySchemaV1),
});

export const updateParamsSchema = schema.object({
  id: schema.string({
    meta: {
      description: 'The identifier for the rule.',
    },
  }),
});
