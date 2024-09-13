/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { merge } from 'lodash';
import type { DeepPartial } from 'utility-types';
import { v4 as uuidV4 } from 'uuid';

import type {
  FleetActionRequest,
  FleetActionResult,
  FleetActionsClientInterface,
  BulkCreateResponse,
} from './types';

export const generateFleetAction = (
  overrides: DeepPartial<FleetActionRequest> = {}
): FleetActionRequest => {
  return merge(
    {
      '@timestamp': moment().toISOString(),
      action_id: uuidV4(),
      agents: [uuidV4()],
      expiration: moment().add(1, 'day').toISOString(),
      data: {},
      input_type: Math.random().toString(36).slice(2),
      timeout: 2000,
      type: 'INPUT_ACTION',
      user_id: 'elastic',
    },
    overrides as FleetActionRequest
  );
};

export const generateFleetActionResult = (
  overrides: DeepPartial<FleetActionResult> = {}
): FleetActionResult => {
  return merge(
    {
      '@timestamp': moment().toISOString(),
      action_id: uuidV4(),
      action_data: {},
      action_input_type: Math.random().toString(36).slice(2),
      action_response:
        overrides.action_input_type === 'endpoint'
          ? {
              endpoint: {
                ack: true,
              },
            }
          : undefined,
      agent_id: uuidV4(),
      completed_at: moment().add(1, 'minute').toISOString(),
      error: undefined,
      started_at: moment().add(10, 'second').toISOString(),
    },
    overrides as FleetActionResult
  );
};

export const generateFleetActionsESResponse = (actions: Array<Partial<FleetActionRequest>>) => {
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
  results: Array<Partial<FleetActionResult>>
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
  successActions: Array<Partial<FleetActionRequest>>,
  failedActions: Array<Partial<FleetActionRequest>> = [],
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

export const createFleetActionsClientMock = (): jest.Mocked<FleetActionsClientInterface> => {
  const createResponse = (action: DeepPartial<FleetActionRequest>): FleetActionRequest =>
    generateFleetAction(action);

  const bulkCreateResponse = (
    actions: Array<DeepPartial<FleetActionRequest>>
  ): BulkCreateResponse => ({
    status: 'success',
    items: actions.map((action) => ({ status: 'success', id: action.action_id || uuidV4() })),
  });

  const actionsRequests = (ids: string[]): FleetActionRequest[] =>
    ids.map((id) =>
      generateFleetAction({
        action_id: id,
        input_type: 'foo',
      })
    );

  const actionsResults = (ids: string[]): FleetActionResult[] =>
    ids.map((id) =>
      generateFleetActionResult({
        action_id: id,
        action_input_type: 'foo',
      })
    );

  return {
    create: jest.fn(async (action) => {
      return createResponse(action);
    }),

    bulkCreate: jest.fn(async (actions) => bulkCreateResponse(actions)),

    getActionsByIds: jest.fn(async (ids) => {
      const items = actionsRequests(ids);
      return {
        items,
        total: items.length,
      };
    }),

    getActionsWithKuery: jest.fn(async (_) => {
      const items = actionsRequests(['action_id_1', 'action_id_2']);
      return {
        items,
        total: items.length,
      };
    }),

    getResultsByIds: jest.fn(async (ids) => {
      const items = actionsResults(ids);
      return {
        items,
        total: items.length,
      };
    }),

    getResultsWithKuery: jest.fn(async (_) => {
      const items = actionsResults(['action_id_1', 'action_id_2']);
      return {
        items,
        total: items.length,
      };
    }),
  };
};
