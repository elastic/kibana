/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** By default, these fields are allowed to be sent to the assistant */
export const DEFAULT_ALLOW = [
  '_id',
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
  'host.risk.calculated_level',
  'host.risk.calculated_score_norm',
  'kibana.alert.last_detected',
  'kibana.alert.risk_score',
  'kibana.alert.rule.description',
  'kibana.alert.rule.name',
  'kibana.alert.rule.references',
  'kibana.alert.rule.threat.framework',
  'kibana.alert.rule.threat.tactic.id',
  'kibana.alert.rule.threat.tactic.name',
  'kibana.alert.rule.threat.tactic.reference',
  'kibana.alert.rule.threat.technique.id',
  'kibana.alert.rule.threat.technique.name',
  'kibana.alert.rule.threat.technique.reference',
  'kibana.alert.rule.threat.technique.subtechnique.id',
  'kibana.alert.rule.threat.technique.subtechnique.name',
  'kibana.alert.rule.threat.technique.subtechnique.reference',
  'kibana.alert.severity',
  'kibana.alert.workflow_status',
  'process.args',
  'process.command_line',
  'process.executable',
  'process.Ext.token.integrity_level_name',
  'process.entity_id',
  'process.exit_code',
  'process.hash.md5',
  'process.hash.sha1',
  'process.name',
  'process.hash.sha256',
  'process.parent.args',
  'process.parent.args_count',
  'process.parent.code_signature.exists',
  'process.parent.code_signature.status',
  'process.parent.code_signature.subject_name',
  'process.parent.code_signature.trusted',
  'process.parent.command_line',
  'process.parent.entity_id',
  'process.parent.executable',
  'process.pid',
  'process.working_directory',
  'network.protocol',
  'source.ip',
  'user.domain',
  'user.name',
  'user.risk.calculated_level',
  'user.risk.calculated_score_norm',
];

/** By default, these fields will be anonymized */
export const DEFAULT_ALLOW_REPLACEMENT = [
  '_id', // the document's _id is replaced with an anonymized value
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

export const getDefaultAnonymizationFields = (spaceId: string) => {
  const changedAt = new Date().toISOString();
  return DEFAULT_ALLOW.map((field) => ({
    '@timestamp': changedAt,
    created_at: changedAt,
    created_by: '',
    field,
    anonymized: DEFAULT_ALLOW_REPLACEMENT.includes(field),
    allowed: true,
    namespace: spaceId,
  }));
};
