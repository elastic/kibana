/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';

import type { FleetAction, FleetActionResponse } from './types';

export const generateFleetActionsESResponse = (actions: Array<Partial<FleetAction>>) => {
  const hits = actions.map((action) => ({
    _index: '.fleet-actions-7',
    _id: action.action_id || uuidV4(),
    _score: 1.0,
    _source: {
      ...action,
    },
  }));

  return {
    took: 1,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: actions.length,
      max_score: 1.0,
      hits,
    },
  };
};

export const generateFleetActionsResultsESResponse = (
  results: Array<Partial<FleetActionResponse>>
) => {
  const hits = results.map((result) => ({
    _index: '.ds-.fleet-actions-results-2023.05.29-000001',
    _id: uuidV4(),
    _score: 1.0,
    _source: {
      ...result,
    },
  }));

  return {
    took: 1,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: results.length,
      max_score: 1.0,
      hits,
    },
  };
};

export const generateFleetActionsBulkCreateESResponse = (
  successActions: Array<Partial<FleetAction>>,
  failedActions: Array<Partial<FleetAction>> = [],
  hasErrors = false
) => {
  const items = [];
  for (let i = 0; i < successActions.length; i++) {
    items.push({
      create: {
        _index: '.fleet-actions-7',
        _id: successActions[i].action_id || uuidV4(),
        _version: 1,
        result: 'created',
        _shards: {
          total: 2,
          successful: 1,
          failed: 0,
        },
        _seq_no: i,
        status: 201,
        _primary_term: i,
      },
    });
  }

  if (hasErrors) {
    for (let i = 0; i < failedActions.length; i++) {
      items.push({
        create: {
          _index: '.fleet-actions-7',
          _id: failedActions[i].action_id || uuidV4(),
          status: 503,
          error: {
            type: 'some-error-type',
            reason: 'some-reason-for-failure',
          },
        },
      });
    }
  }

  return {
    took: 23,
    errors: hasErrors,
    items,
  };
};
