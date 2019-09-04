/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// ---------------------------------- WARNING ----------------------------------
// this file was generated, and should not be edited by hand
// ---------------------------------- WARNING ----------------------------------

// provides TypeScript and config-schema interfaces for ECS for use with
// the event log

import { schema, TypeOf } from '@kbn/config-schema';

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U> ? Array<DeepPartial<U>> : DeepPartial<T[P]>;
};

export const ECS_VERSION = '1.3.1';

// types and config-schema describing the es structures
export type IValidatedEvent = TypeOf<typeof EventSchema>;
export type IEvent = DeepPartial<DeepWriteable<IValidatedEvent>>;

export const EventSchema = schema.maybe(
  schema.object({
    '@timestamp': ecsDate(),
    tags: ecsStringMulti(),
    message: ecsString(),
    ecs: schema.maybe(
      schema.object({
        version: ecsString(),
      })
    ),
    event: schema.maybe(
      schema.object({
        action: ecsString(),
        provider: ecsString(),
        start: ecsDate(),
        duration: ecsNumber(),
        end: ecsDate(),
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
        namespace: ecsString(),
        saved_objects: schema.maybe(
          schema.arrayOf(
            schema.object({
              store: ecsString(),
              id: ecsString(),
              type: ecsString(),
            })
          )
        ),
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
