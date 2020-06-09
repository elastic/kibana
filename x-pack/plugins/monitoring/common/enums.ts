/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum AlertClusterHealthType {
  Green = 'green',
  Red = 'red',
  Yellow = 'yellow',
}

export enum AlertSeverity {
  Success = 'success',
  Danger = 'danger',
  Warning = 'warning',
}

export enum AlertMessageTokenType {
  Time = 'time',
  Link = 'link',
  DocLink = 'docLink',
}

export enum AlertParamType {
  Duration = 'duration',
  Percentage = 'percentage',
}
