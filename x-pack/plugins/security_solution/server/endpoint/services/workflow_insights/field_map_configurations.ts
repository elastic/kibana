/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FieldMap } from '@kbn/data-stream-adapter';

export const securityWorkflowInsightsFieldMap: FieldMap = {
  '@timestamp': {
    type: 'date',
    array: false,
    required: true,
  },
  message: {
    type: 'text',
    array: false,
    required: true,
  },
  // endpoint or other part of security
  category: {
    type: 'keyword',
    array: false,
    required: true,
  },
  // incompatible_virus, noisy_process_tree, etc
  type: {
    type: 'keyword',
    array: false,
    required: true,
  },
  // the creator of the insight
  source: {
    type: 'nested',
    array: false,
    required: true,
  },
  // kibana-insight-task, llm-request-id, etc
  'source.id': {
    type: 'keyword',
    array: false,
    required: true,
  },
  // endpoint, kibana, llm, etc
  'source.type': {
    type: 'keyword',
    array: false,
    required: true,
  },
  // starting timestamp of the source data used to generate the insight
  'source.data_range_start': {
    type: 'date',
    array: false,
    required: true,
  },
  // ending timestamp of the source data used to generate the insight
  'source.data_range_end': {
    type: 'date',
    array: false,
    required: true,
  },
  // the target that this insight is created for
  target: {
    type: 'nested',
    array: false,
    required: true,
  },
  // endpoint, policy, etc
  'target.id': {
    type: 'keyword',
    array: true,
    required: true,
  },
  // endpoint ids, policy ids, etc
  'target.type': {
    type: 'keyword',
    array: false,
    required: true,
  },
  // latest action taken on the insight
  action: {
    type: 'nested',
    array: false,
    required: true,
  },
  // refreshed, remediated, suppressed, dismissed
  'action.type': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'action.timestamp': {
    type: 'date',
    array: false,
    required: true,
  },
  // unique key for this insight, used for deduplicating insights.
  // ie. crowdstrike or windows_defender
  value: {
    type: 'keyword',
    array: false,
    required: true,
  },
  // suggested remediation for insight
  remediation: {
    type: 'object',
    array: false,
    required: true,
  },
  // if remediation includes exception list items
  'remediation.exception_list_items': {
    type: 'object',
    array: true,
    required: false,
  },
  'remediation.exception_list_items.list_id': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'remediation.exception_list_items.name': {
    type: 'text',
    array: false,
    required: true,
  },
  'remediation.exception_list_items.description': {
    type: 'text',
    array: false,
    required: false,
  },
  'remediation.exception_list_items.entries': {
    type: 'object',
    array: true,
    required: true,
  },
  'remediation.exception_list_items.entries.field': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'remediation.exception_list_items.entries.operator': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'remediation.exception_list_items.entries.type': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'remediation.exception_list_items.entries.value': {
    type: 'text',
    array: false,
    required: true,
  },
  'remediation.exception_list_items.tags': {
    type: 'keyword',
    array: true,
    required: true,
  },
  'remediation.exception_list_items.os_types': {
    type: 'keyword',
    array: true,
    required: true,
  },
  metadata: {
    type: 'object',
    array: false,
    required: true,
  },
  // optional KV for notes
  'metadata.notes': {
    type: 'object',
    array: false,
    required: false,
  },
  // optional i8n variables
  'metadata.message_variables': {
    type: 'text',
    array: true,
    required: false,
  },
} as const;
