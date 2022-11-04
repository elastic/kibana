/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { getCommonSetupContract } from './get_common_setup_contract';

describe('getCommonSetupContract', () => {
  test('it works fine with the minimal configuration', () => {
    expect(getCommonSetupContract({})).toMatchInlineSnapshot(`
      Object {
        "cloudId": undefined,
        "inTrial$": undefined,
        "isElasticStaffOwned": undefined,
        "isPaying$": undefined,
        "organizationCreatedAt": undefined,
        "trialEndDate": undefined,
      }
    `);
  });

  test('only with cloudId and isElasticStaffOwned', () => {
    expect(getCommonSetupContract({ id: 'some_cloud_id', is_elastic_staff_owned: false }))
      .toMatchInlineSnapshot(`
      Object {
        "cloudId": "some_cloud_id",
        "inTrial$": undefined,
        "isElasticStaffOwned": false,
        "isPaying$": undefined,
        "organizationCreatedAt": undefined,
        "trialEndDate": undefined,
      }
    `);
  });

  test('with everything', () => {
    expect(
      getCommonSetupContract({
        id: 'some_cloud_id',
        is_elastic_staff_owned: false,
        trial_end_date: '2022-11-04T00:00:00Z',
        organization_created_at: '2020-10-04T00:00:00Z',
      })
    ).toStrictEqual({
      cloudId: 'some_cloud_id',
      isElasticStaffOwned: false,
      trialEndDate: new Date('2022-11-04T00:00:00Z'),
      inTrial$: expect.any(Observable),
      isPaying$: expect.any(Observable),
      organizationCreatedAt: new Date('2020-10-04T00:00:00Z'),
    });
  });
});
