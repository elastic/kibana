/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  InfraSavedSourceConfigurationColumn,
  InfraSavedSourceConfigurationFields,
  InfraSourceConfigurationMessageColumn,
  InfraSourceConfigurationTimestampColumn,
} from '../../common/http_api/source_api';

export type LogColumnConfiguration = InfraSavedSourceConfigurationColumn;
export type FieldLogColumnConfiguration = InfraSavedSourceConfigurationFields;
export type MessageLogColumnConfiguration = InfraSourceConfigurationMessageColumn;
export type TimestampLogColumnConfiguration = InfraSourceConfigurationTimestampColumn;

export const isFieldLogColumnConfiguration = (
  logColumnConfiguration: LogColumnConfiguration
): logColumnConfiguration is FieldLogColumnConfiguration =>
  logColumnConfiguration != null && 'fieldColumn' in logColumnConfiguration;

export const isMessageLogColumnConfiguration = (
  logColumnConfiguration: LogColumnConfiguration
): logColumnConfiguration is MessageLogColumnConfiguration =>
  logColumnConfiguration != null && 'messageColumn' in logColumnConfiguration;

export const isTimestampLogColumnConfiguration = (
  logColumnConfiguration: LogColumnConfiguration
): logColumnConfiguration is TimestampLogColumnConfiguration =>
  logColumnConfiguration != null && 'timestampColumn' in logColumnConfiguration;
