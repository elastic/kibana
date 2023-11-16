/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** By default, these fields are allowed to be sent to the assistant */
export const DEFAULT_ALLOW = [
  '@timestamp',
  'cloud.availability_zone',
  'cloud.provider',
  'cloud.region',
  'destination.ip',
  'dns.question.name',
  'dns.question.type',
  'event.action',
  'event.category',
  'event.dataset',
  'event.module',
  'event.outcome',
  'event.type',
  'file.Ext.original.path',
  'file.hash.sha256',
  'file.name',
  'file.path',
  'host.name',
  'kibana.alert.rule.name',
  'network.protocol',
  'process.args',
  'process.exit_code',
  'process.hash.md5',
  'process.hash.sha1',
  'process.hash.sha256',
  'process.parent.name',
  'process.parent.pid',
  'process.name',
  'process.pid',
  'source.ip',
  'user.domain',
  'user.name',
];

/** By default, these fields will be anonymized */
export const DEFAULT_ALLOW_REPLACEMENT = [
  'cloud.availability_zone',
  'cloud.provider',
  'cloud.region',
  'destination.ip',
  'file.Ext.original.path',
  'file.name',
  'file.path',
  'host.ip', // not a default allow field, but anonymized by default
  'host.name',
  'source.ip',
  'user.domain',
  'user.name',
];
