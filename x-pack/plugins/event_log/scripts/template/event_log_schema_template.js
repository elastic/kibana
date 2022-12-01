#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const EventLogSchemaFileTemplate = `
// provides TypeScript and config-schema interfaces for ECS for use with
// the event log

import { schema, TypeOf } from '@kbn/config-schema';
import semver from 'semver';

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U> ? Array<DeepPartial<U>> : DeepPartial<T[P]>;
};

export const ECS_VERSION = '%%ECS_VERSION%%';

// types and config-schema describing the es structures
export type IValidatedEvent = TypeOf<typeof EventSchema>;
export type IEvent = DeepPartial<DeepWriteable<IValidatedEvent>>;

export const EventSchema = %%SCHEMA%%;

function ecsStringMulti() {
  return schema.maybe(schema.arrayOf(schema.string()));
}

function ecsString() {
  return schema.maybe(schema.string());
}

function ecsNumber() {
  return schema.maybe(schema.number());
}

function ecsStringOrNumber() {
  return schema.maybe(schema.oneOf([schema.string(), schema.number()]));
}

function ecsDate() {
  return schema.maybe(schema.string({ validate: validateDate }));
}

function ecsBoolean() {
  return schema.maybe(schema.boolean());
}

const ISO_DATE_PATTERN = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/;

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
`.trim();

module.exports = {
  EventLogSchemaFileTemplate,
};
