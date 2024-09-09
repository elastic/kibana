/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Moment from 'moment';

export const AGENT_ACTIONS_FIXTURES = [
  {
    _source: {
      action_id: 'current-in-progress-action',
      '@timestamp': Moment().subtract('5', 'minute').toISOString(),
      expiration: Moment().add(1, 'day').toISOString(),
    },
  },
  {
    _source: {
      action_id: 'current-complete-action',
      '@timestamp': Moment().subtract('5', 'minute').toISOString(),
      expiration: Moment().add(1, 'day').toISOString(),
    },
  },
  {
    _source: {
      action_id: 'expired-incomplete-action',
      '@timestamp': Moment().subtract(6, 'hour').toISOString(),
      expiration: Moment().subtract(3, 'hour').toISOString(),
    },
  },
  {
    _source: {
      action_id: 'expired-complete-action',
      '@timestamp': Moment().subtract(6, 'hour').toISOString(),
      expiration: Moment().subtract(3, 'hour').toISOString(),
    },
  },
  {
    _source: {
      action_id: 'current-error-action',
      '@timestamp': Moment().subtract('5', 'minute').toISOString(),
      expiration: Moment().add(1, 'day').toISOString(),
    },
  },
  {
    _source: {
      action_id: 'expired-error-action',
      '@timestamp': Moment().subtract(6, 'hour').toISOString(),
      expiration: Moment().subtract(3, 'hour').toISOString(),
    },
  },
  {
    _source: {
      action_id: 'current-deleted-action',
      '@timestamp': Moment().subtract('5', 'minute').toISOString(),
      expiration: Moment().add(1, 'day').toISOString(),
    },
  },
  {
    _source: {
      action_id: 'expired-deleted-action',
      '@timestamp': Moment().subtract(6, 'hour').toISOString(),
      expiration: Moment().subtract(3, 'hour').toISOString(),
    },
  },
  {
    _source: {
      action_id: 'old-incomplete-action',
      '@timestamp': Moment().subtract(90, 'day').toISOString(),
      expiration: Moment().subtract(89, 'day').toISOString(),
    },
  },
  {
    _source: {
      action_id: 'old-complete-action',
      '@timestamp': Moment().subtract(90, 'day').toISOString(),
      expiration: Moment().subtract(89, 'day').toISOString(),
    },
  },
];

export const AGENT_ACTIONS_RESULTS_FIXTURES = [
  {
    _source: {
      action_id: 'current-in-progress-action',
    },
  },
  {
    _source: {
      action_id: 'current-complete-action',
      data: { upload_id: 'current-complete-file' },
    },
  },
  {
    _source: {
      action_id: 'expired-incomplete-action',
    },
  },
  {
    _source: {
      action_id: 'expired-complete-action',
      data: { upload_id: 'expired-complete-file' },
    },
  },
  {
    _source: {
      action_id: 'current-error-action',
      error: 'some diagnostics err',
    },
  },
  {
    _source: {
      action_id: 'expired-error-action',
      error: 'some diagnostics err',
    },
  },
  {
    _source: {
      action_id: 'current-deleted-action',
      data: { upload_id: 'current-deleted-file' },
    },
  },
  {
    _source: {
      action_id: 'expired-deleted-action',
      data: { upload_id: 'expired-deleted-file' },
    },
  },
  {
    _source: {
      action_id: 'old-incomplete-action',
    },
  },
  {
    _source: {
      action_id: 'old-complete-action',
      data: { upload_id: 'old-complete-file' },
    },
  },
];

export const FILES_METADATA_BY_ACTION_ID: Record<string, any> = {
  'current-complete-action': {
    _id: 'current-complete-file',
    _source: {
      file: { name: 'current-complete-file.zip', Status: 'READY' },
    },
  },
  'expired-complete-action': {
    _id: 'expired-complete-file',
    _source: {
      file: { name: 'expired-complete-file.zip', Status: 'READY' },
    },
  },
  'current-deleted-action': {
    _id: 'current-complete-file',
    _source: {
      file: { name: 'current-complete-file.zip', Status: 'DELETED' },
    },
  },
  'expired-deleted-action': {
    _id: 'expired-complete-file',
    _source: {
      file: { name: 'expired-complete-file.zip', Status: 'DELETED' },
    },
  },
  'old-complete-action': {
    _id: 'old-complete-file',
    _source: {
      file: { name: 'old-complete-file.zip', Status: 'READY' },
    },
  },
};
