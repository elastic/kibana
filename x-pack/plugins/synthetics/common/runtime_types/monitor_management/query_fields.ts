/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import { ConfigKey } from '../../constants/monitor_management';

const MonitorQueryableFieldsLiterals = schema.oneOf([
  schema.literal(ConfigKey.MONITOR_QUERY_ID),
  schema.literal(ConfigKey.CONFIG_ID),
  schema.literal(ConfigKey.NAME),
  schema.literal(ConfigKey.JOURNEY_ID),
  schema.literal(ConfigKey.LOCATIONS),
  schema.literal(ConfigKey.CONFIG_HASH),
]);

const MonitorQueryableFieldsArraySchema = schema.arrayOf(MonitorQueryableFieldsLiterals);

export const MonitorQueryableFieldsSchema = schema.maybe(
  schema.oneOf([MonitorQueryableFieldsLiterals, MonitorQueryableFieldsArraySchema])
);

export type MonitorQueryableFields = TypeOf<typeof MonitorQueryableFieldsArraySchema>;
