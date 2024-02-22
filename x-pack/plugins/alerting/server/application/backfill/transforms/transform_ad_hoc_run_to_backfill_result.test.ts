/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AdHocRunSO } from '../../../data/ad_hoc_run/types';
import { SavedObject } from '@kbn/core/server';
import { adHocRunStatus } from '../../../../common/constants';
import { transformAdHocRunToBackfillResult } from './transform_ad_hoc_run_to_backfill_result';

function getMockAdHocRunAttributes({
  ruleId,
  overwrites,
  omitApiKey = false,
}: {
  ruleId?: string;
  overwrites?: Record<string, unknown>;
  omitApiKey?: boolean;
} = {}): AdHocRunSO {
  return {
    ...(omitApiKey ? {} : { apiKeyId: '123', apiKeyToUse: 'MTIzOmFiYw==' }),
    createdAt: '2024-01-30T00:00:00.000Z',
    duration: '12h',
    enabled: true,
    rule: {
      ...(ruleId ? { id: ruleId } : {}),
      name: 'my rule name',
      tags: ['foo'],
      alertTypeId: 'myType',
      // @ts-expect-error
      params: {},
      apiKeyOwner: 'user',
      apiKeyCreatedByUser: false,
      consumer: 'myApp',
      enabled: true,
      schedule: {
        interval: '12h',
      },
      createdBy: 'user',
      updatedBy: 'user',
      createdAt: '2019-02-12T21:01:22.479Z',
      updatedAt: '2019-02-12T21:01:22.479Z',
      revision: 0,
    },
    spaceId: 'default',
    start: '2023-10-19T15:07:40.011Z',
    status: adHocRunStatus.PENDING,
    schedule: [
      {
        interval: '12h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-10-20T03:07:40.011Z',
      },
      {
        interval: '12h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-10-20T15:07:40.011Z',
      },
    ],
    ...overwrites,
  };
}

function getBulkCreateResponse(
  id: string,
  ruleId: string,
  attributes: AdHocRunSO
): SavedObject<AdHocRunSO> {
  return {
    type: 'ad_hoc_rule_run_params',
    id,
    namespaces: ['default'],
    attributes,
    references: [
      {
        id: ruleId,
        name: 'rule',
        type: 'alert',
      },
    ],
    managed: false,
    coreMigrationVersion: '8.8.0',
    updated_at: '2024-02-07T16:05:39.296Z',
    created_at: '2024-02-07T16:05:39.296Z',
    version: 'WzcsMV0=',
  };
}

describe('transformAdHocRunToBackfillResult', () => {
  test('should transform bulk create response', () => {
    expect(
      transformAdHocRunToBackfillResult(
        getBulkCreateResponse('abc', '1', getMockAdHocRunAttributes())
      )
    ).toEqual({
      id: 'abc',
      createdAt: '2024-01-30T00:00:00.000Z',
      duration: '12h',
      enabled: true,
      rule: {
        id: '1',
        name: 'my rule name',
        tags: ['foo'],
        alertTypeId: 'myType',
        params: {},
        apiKeyOwner: 'user',
        apiKeyCreatedByUser: false,
        consumer: 'myApp',
        enabled: true,
        schedule: {
          interval: '12h',
        },
        createdBy: 'user',
        updatedBy: 'user',
        createdAt: '2019-02-12T21:01:22.479Z',
        updatedAt: '2019-02-12T21:01:22.479Z',
        revision: 0,
      },
      spaceId: 'default',
      start: '2023-10-19T15:07:40.011Z',
      status: adHocRunStatus.PENDING,
      schedule: [
        {
          interval: '12h',
          status: adHocRunStatus.PENDING,
          runAt: '2023-10-20T03:07:40.011Z',
        },
        {
          interval: '12h',
          status: adHocRunStatus.PENDING,
          runAt: '2023-10-20T15:07:40.011Z',
        },
      ],
    });
  });

  test('should return error for malformed responses', () => {
    expect(
      transformAdHocRunToBackfillResult(
        // missing id
        // @ts-expect-error
        {
          type: 'ad_hoc_rule_run_params',
          namespaces: ['default'],
          attributes: getMockAdHocRunAttributes(),
          references: [{ id: '1', name: 'rule', type: 'alert' }],
          managed: false,
          coreMigrationVersion: '8.8.0',
          updated_at: '2024-02-07T16:05:39.296Z',
          created_at: '2024-02-07T16:05:39.296Z',
          version: 'WzcsMV0=',
        }
      )
    ).toEqual({
      error: {
        error: 'Internal Server Error',
        message: 'Malformed saved object in bulkCreate response - Missing "id".',
      },
    });
    expect(
      transformAdHocRunToBackfillResult(
        // missing attributes
        // @ts-expect-error
        {
          type: 'ad_hoc_rule_run_params',
          id: 'abc',
          namespaces: ['default'],
          references: [{ id: '1', name: 'rule', type: 'alert' }],
          managed: false,
          coreMigrationVersion: '8.8.0',
          updated_at: '2024-02-07T16:05:39.296Z',
          created_at: '2024-02-07T16:05:39.296Z',
          version: 'WzcsMV0=',
        }
      )
    ).toEqual({
      error: {
        error: 'Internal Server Error',
        message: 'Malformed saved object in bulkCreate response - Missing "attributes".',
      },
    });
    expect(
      transformAdHocRunToBackfillResult(
        // missing references
        // @ts-expect-error
        {
          type: 'ad_hoc_rule_run_params',
          id: 'def',
          namespaces: ['default'],
          attributes: getMockAdHocRunAttributes(),
          managed: false,
          coreMigrationVersion: '8.8.0',
          updated_at: '2024-02-07T16:05:39.296Z',
          created_at: '2024-02-07T16:05:39.296Z',
          version: 'WzcsMV0=',
        }
      )
    ).toEqual({
      error: {
        error: 'Internal Server Error',
        message: 'Malformed saved object in bulkCreate response - Missing "references".',
      },
    });
    expect(
      transformAdHocRunToBackfillResult(
        // empty references
        {
          type: 'ad_hoc_rule_run_params',
          id: 'ghi',
          namespaces: ['default'],
          attributes: getMockAdHocRunAttributes(),
          references: [],
          managed: false,
          coreMigrationVersion: '8.8.0',
          updated_at: '2024-02-07T16:05:39.296Z',
          created_at: '2024-02-07T16:05:39.296Z',
          version: 'WzcsMV0=',
        }
      )
    ).toEqual({
      error: {
        error: 'Internal Server Error',
        message: 'Malformed saved object in bulkCreate response - Missing "references".',
      },
    });
  });

  test('should pass through error if saved object error', () => {
    expect(
      transformAdHocRunToBackfillResult(
        // @ts-expect-error
        {
          type: 'ad_hoc_rule_run_params',
          id: '788a2784-c021-484f-a53e-0c1c63c7567c',
          error: {
            error: 'my error',
            message: 'Unable to create',
            statusCode: 404,
          },
        }
      )
    ).toEqual({
      error: {
        error: 'my error',
        message: 'Unable to create',
      },
    });
  });
});
