/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INITIAL_AGENT_FIELDS_TO_EXPORT = [
  { field: 'agent.id' },
  { field: 'status' },
  { field: 'local_metadata.host.hostname' },
  { field: 'policy_id' }, // policy name would need to be enriched
  { field: 'last_checkin' },
  { field: 'local_metadata.elastic.agent.version' },
];

export const AGENT_FIELDS_TO_EXPORT = [
  {
    field: 'active',
  },
  {
    field: 'agent.id',
  },
  {
    field: 'audit_unenrolled_reason',
  },
  {
    field: 'audit_unenrolled_time',
  },
  {
    field: 'enrolled_at',
  },
  {
    field: 'last_checkin',
  },
  {
    field: 'last_checkin_message',
  },
  {
    field: 'last_checkin_status',
  },
  {
    field: 'last_updated',
  },
  {
    field: 'local_metadata.elastic.agent.build.original',
  },
  {
    field: 'local_metadata.elastic.agent.log_level',
  },
  {
    field: 'local_metadata.elastic.agent.snapshot',
  },
  {
    field: 'local_metadata.elastic.agent.unprivileged',
  },
  {
    field: 'local_metadata.elastic.agent.upgradeable',
  },
  {
    field: 'local_metadata.elastic.agent.version',
  },
  {
    field: 'local_metadata.host.architecture',
  },
  {
    field: 'local_metadata.host.hostname',
  },
  {
    field: 'local_metadata.host.id',
  },
  {
    field: 'local_metadata.host.ip',
  },
  {
    field: 'local_metadata.host.mac',
  },
  {
    field: 'local_metadata.host.name',
  },
  {
    field: 'local_metadata.os.family',
  },
  {
    field: 'local_metadata.os.full',
  },
  {
    field: 'local_metadata.os.kernel',
  },
  {
    field: 'local_metadata.os.name',
  },
  {
    field: 'local_metadata.os.platform',
  },
  {
    field: 'local_metadata.os.version',
  },
  {
    field: 'policy_id',
  },
  {
    field: 'tags',
  },
  {
    field: 'unenrolled_at',
  },
  {
    field: 'unenrolled_reason',
  },
  {
    field: 'unenrollment_started_at',
  },
  {
    field: 'unhealthy_reason',
  },
  {
    field: 'updated_at',
  },
  {
    field: 'upgrade_started_at',
  },
  {
    field: 'upgrade_status',
  },
  {
    field: 'upgraded_at',
  },
  {
    field: 'user_provided_metadata',
  },
];
