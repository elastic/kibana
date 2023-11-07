/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  InfraSourceConfigurationColumn,
  InfraSourceConfigurationFieldColumn,
  InfraSourceConfigurationMessageColumn,
  InfraSourceConfigurationTimestampColumn,
} from '../../common/source_configuration/source_configuration';

export type LogColumnConfiguration = InfraSourceConfigurationColumn;
export type FieldLogColumnConfiguration = InfraSourceConfigurationFieldColumn;
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

export const getLogColumnConfigurationId = (
  logColumnConfiguration: LogColumnConfiguration
): string => {
  if (isTimestampLogColumnConfiguration(logColumnConfiguration)) {
    return logColumnConfiguration.timestampColumn.id;
  } else if (isMessageLogColumnConfiguration(logColumnConfiguration)) {
    return logColumnConfiguration.messageColumn.id;
  } else {
    return logColumnConfiguration.fieldColumn.id;
  }
};
