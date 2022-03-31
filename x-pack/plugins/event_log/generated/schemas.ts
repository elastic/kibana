/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ---------------------------------- WARNING ----------------------------------
// this file was generated, and should not be edited by hand
// ---------------------------------- WARNING ----------------------------------

// provides TypeScript and config-schema interfaces for ECS for use with
// the event log

import { schema, TypeOf } from '@kbn/config-schema';
import semver from 'semver';

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U> ? Array<DeepPartial<U>> : DeepPartial<T[P]>;
};

export const ECS_VERSION = '1.8.0';

// types and config-schema describing the es structures
export type IValidatedEvent = TypeOf<typeof EventSchema>;
export type IEvent = DeepPartial<DeepWriteable<IValidatedEvent>>;

export const EventSchema = schema.maybe(
  schema.object({
    '@timestamp': ecsDate(),
    message: ecsString(),
    tags: ecsStringMulti(),
    ecs: schema.maybe(
      schema.object({
        version: ecsString(),
      })
    ),
    error: schema.maybe(
      schema.object({
        code: ecsString(),
        id: ecsString(),
        message: ecsString(),
        stack_trace: ecsString(),
        type: ecsString(),
      })
    ),
    event: schema.maybe(
      schema.object({
        action: ecsString(),
        category: ecsStringMulti(),
        code: ecsString(),
        created: ecsDate(),
        dataset: ecsString(),
        duration: ecsNumber(),
        end: ecsDate(),
        hash: ecsString(),
        id: ecsString(),
        ingested: ecsDate(),
        kind: ecsString(),
        module: ecsString(),
        original: ecsString(),
        outcome: ecsString(),
        provider: ecsString(),
        reason: ecsString(),
        reference: ecsString(),
        risk_score: ecsNumber(),
        risk_score_norm: ecsNumber(),
        sequence: ecsNumber(),
        severity: ecsNumber(),
        start: ecsDate(),
        timezone: ecsString(),
        type: ecsStringMulti(),
        url: ecsString(),
      })
    ),
    log: schema.maybe(
      schema.object({
        level: ecsString(),
        logger: ecsString(),
      })
    ),
    rule: schema.maybe(
      schema.object({
        author: ecsStringMulti(),
        category: ecsString(),
        description: ecsString(),
        id: ecsString(),
        license: ecsString(),
        name: ecsString(),
        reference: ecsString(),
        ruleset: ecsString(),
        uuid: ecsString(),
        version: ecsString(),
      })
    ),
    user: schema.maybe(
      schema.object({
        name: ecsString(),
      })
    ),
    kibana: schema.maybe(
      schema.object({
        server_uuid: ecsString(),
        task: schema.maybe(
          schema.object({
            id: ecsString(),
            scheduled: ecsDate(),
            schedule_delay: ecsNumber(),
          })
        ),
        alerting: schema.maybe(
          schema.object({
            instance_id: ecsString(),
            action_group_id: ecsString(),
            action_subgroup: ecsString(),
            status: ecsString(),
          })
        ),
        alert: schema.maybe(
          schema.object({
            rule: schema.maybe(
              schema.object({
                consumer: ecsString(),
                execution: schema.maybe(
                  schema.object({
                    uuid: ecsString(),
                    status: ecsString(),
                    status_order: ecsNumber(),
                    metrics: schema.maybe(
                      schema.object({
                        number_of_triggered_actions: ecsNumber(),
                        number_of_scheduled_actions: ecsNumber(),
                        number_of_new_alerts: ecsNumber(),
                        number_of_active_alerts: ecsNumber(),
                        number_of_recovered_alerts: ecsNumber(),
                        number_of_searches: ecsNumber(),
                        total_indexing_duration_ms: ecsNumber(),
                        es_search_duration_ms: ecsNumber(),
                        total_search_duration_ms: ecsNumber(),
                        execution_gap_duration_s: ecsNumber(),
                      })
                    ),
                  })
                ),
                rule_type_id: ecsString(),
              })
            ),
          })
        ),
        saved_objects: schema.maybe(
          schema.arrayOf(
            schema.object({
              rel: ecsString(),
              namespace: ecsString(),
              id: ecsString(),
              type: ecsString(),
              type_id: ecsString(),
            })
          )
        ),
        space_ids: ecsStringMulti(),
        version: ecsVersion(),
      })
    ),
  })
);

function ecsStringMulti() {
  return schema.maybe(schema.arrayOf(schema.string()));
}

function ecsString() {
  return schema.maybe(schema.string());
}

function ecsNumber() {
  return schema.maybe(schema.number());
}

function ecsDate() {
  return schema.maybe(schema.string({ validate: validateDate }));
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function validateDate(isoDate: string) {
  if (ISO_DATE_PATTERN.test(isoDate)) return;
  return 'string is not a valid ISO date: ' + isoDate;
}

function ecsVersion() {
  return schema.maybe(schema.string({ validate: validateVersion }));
}

function validateVersion(version: string) {
  if (semver.valid(version)) return;
  return 'string is not a valid version: ' + version;
}
