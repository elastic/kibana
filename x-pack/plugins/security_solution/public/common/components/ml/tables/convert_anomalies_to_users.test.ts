/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAnomalies } from '../mock';
import { cloneDeep } from 'lodash/fp';
import { convertAnomaliesToUsers, getUserNameFromEntity } from './convert_anomalies_to_users';
import { AnomaliesByUser } from '../types';

describe('convert_anomalies_to_users', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('it returns expected anomalies from a user', () => {
    const entities = convertAnomaliesToUsers(anomalies);
    const expected: AnomaliesByUser[] = [
      {
        anomaly: {
          detectorIndex: 0,
          entityName: 'process.name',
          entityValue: 'du',
          influencers: [
            { 'host.name': 'zeek-iowa' },
            { 'process.name': 'du' },
            { 'user.name': 'root' },
          ],
          jobId: 'job-1',
          rowId: '1561157194802_0',
          severity: 16.193669439507826,
          source: {
            actual: [1],
            bucket_span: 900,
            by_field_name: 'process.name',
            by_field_value: 'du',
            detector_index: 0,
            function: 'rare',
            function_description: 'rare',
            influencers: [
              { influencer_field_name: 'user.name', influencer_field_values: ['root'] },
              { influencer_field_name: 'process.name', influencer_field_values: ['du'] },
              { influencer_field_name: 'host.name', influencer_field_values: ['zeek-iowa'] },
            ],
            initial_record_score: 16.193669439507826,
            is_interim: false,
            job_id: 'job-1',
            multi_bucket_impact: 0,
            partition_field_name: 'host.name',
            partition_field_value: 'zeek-iowa',
            probability: 0.024041164411288146,
            record_score: 16.193669439507826,
            result_type: 'record',
            timestamp: 1560664800000,
            typical: [0.024041164411288146],
          },
          time: 1560664800000,
        },
        userName: 'root',
      },
      {
        anomaly: {
          detectorIndex: 0,
          entityName: 'process.name',
          entityValue: 'ls',
          influencers: [
            { 'host.name': 'zeek-iowa' },
            { 'process.name': 'ls' },
            { 'user.name': 'root' },
          ],
          jobId: 'job-2',
          rowId: '1561157194802_1',
          severity: 16.193669439507826,
          source: {
            actual: [1],
            bucket_span: 900,
            by_field_name: 'process.name',
            by_field_value: 'ls',
            detector_index: 0,
            function: 'rare',
            function_description: 'rare',
            influencers: [
              { influencer_field_name: 'user.name', influencer_field_values: ['root'] },
              { influencer_field_name: 'process.name', influencer_field_values: ['ls'] },
              { influencer_field_name: 'host.name', influencer_field_values: ['zeek-iowa'] },
            ],
            initial_record_score: 16.193669439507826,
            is_interim: false,
            job_id: 'job-2',
            multi_bucket_impact: 0,
            partition_field_name: 'host.name',
            partition_field_value: 'zeek-iowa',
            probability: 0.024041164411288146,
            record_score: 16.193669439507826,
            result_type: 'record',
            timestamp: 1560664800000,
            typical: [0.024041164411288146],
          },
          time: 1560664800000,
        },
        userName: 'root',
      },
    ];
    expect(entities).toEqual(expected);
  });

  test('it returns empty anomalies if sent in a null', () => {
    const entities = convertAnomaliesToUsers(null);
    const expected: AnomaliesByUser[] = [];
    expect(entities).toEqual(expected);
  });

  test('it returns a specific anomaly if sent in the user name of an anomaly', () => {
    anomalies.anomalies[0].entityName = 'something-else';
    anomalies.anomalies[0].entityValue = 'something-else';
    anomalies.anomalies[0].influencers = [
      { 'host.name': 'zeek-iowa' },
      { 'process.name': 'du' },
      { 'user.name': 'something-else' },
    ];

    const entities = convertAnomaliesToUsers(anomalies, 'root');
    const expected: AnomaliesByUser[] = [
      {
        anomaly: {
          detectorIndex: 0,
          entityName: 'process.name',
          entityValue: 'ls',
          influencers: [
            { 'host.name': 'zeek-iowa' },
            { 'process.name': 'ls' },
            { 'user.name': 'root' },
          ],
          jobId: 'job-2',
          rowId: '1561157194802_1',
          severity: 16.193669439507826,
          source: {
            actual: [1],
            bucket_span: 900,
            by_field_name: 'process.name',
            by_field_value: 'ls',
            detector_index: 0,
            function: 'rare',
            function_description: 'rare',
            influencers: [
              { influencer_field_name: 'user.name', influencer_field_values: ['root'] },
              { influencer_field_name: 'process.name', influencer_field_values: ['ls'] },
              { influencer_field_name: 'host.name', influencer_field_values: ['zeek-iowa'] },
            ],
            initial_record_score: 16.193669439507826,
            is_interim: false,
            job_id: 'job-2',
            multi_bucket_impact: 0,
            partition_field_name: 'host.name',
            partition_field_value: 'zeek-iowa',
            probability: 0.024041164411288146,
            record_score: 16.193669439507826,
            result_type: 'record',
            timestamp: 1560664800000,
            typical: [0.024041164411288146],
          },
          time: 1560664800000,
        },
        userName: 'root',
      },
    ];
    expect(entities).toEqual(expected);
  });

  test('it returns a specific anomaly if an influencer has the user name', () => {
    anomalies.anomalies[0].entityName = 'something-else';
    anomalies.anomalies[0].entityValue = 'something-else';
    anomalies.anomalies[0].influencers = [
      { 'host.name': 'zeek-iowa' },
      { 'process.name': 'du' },
      { 'user.name': 'something-else' },
    ];

    anomalies.anomalies[1].entityName = 'something-else';
    anomalies.anomalies[1].entityValue = 'something-else';
    const entities = convertAnomaliesToUsers(anomalies, 'root');
    const expected: AnomaliesByUser[] = [
      {
        anomaly: {
          detectorIndex: 0,
          entityName: 'something-else',
          entityValue: 'something-else',
          influencers: [
            { 'host.name': 'zeek-iowa' },
            { 'process.name': 'ls' },
            { 'user.name': 'root' },
          ],
          jobId: 'job-2',
          rowId: '1561157194802_1',
          severity: 16.193669439507826,
          source: {
            actual: [1],
            bucket_span: 900,
            by_field_name: 'process.name',
            by_field_value: 'ls',
            detector_index: 0,
            function: 'rare',
            function_description: 'rare',
            influencers: [
              { influencer_field_name: 'user.name', influencer_field_values: ['root'] },
              { influencer_field_name: 'process.name', influencer_field_values: ['ls'] },
              { influencer_field_name: 'host.name', influencer_field_values: ['zeek-iowa'] },
            ],
            initial_record_score: 16.193669439507826,
            is_interim: false,
            job_id: 'job-2',
            multi_bucket_impact: 0,
            partition_field_name: 'host.name',
            partition_field_value: 'zeek-iowa',
            probability: 0.024041164411288146,
            record_score: 16.193669439507826,
            result_type: 'record',
            timestamp: 1560664800000,
            typical: [0.024041164411288146],
          },
          time: 1560664800000,
        },
        userName: 'root',
      },
    ];
    expect(entities).toEqual(expected);
  });

  test('it returns empty anomalies if sent in the name of one that does not exist', () => {
    const entities = convertAnomaliesToUsers(anomalies, 'some-made-up-name-here-for-you');
    const expected: AnomaliesByUser[] = [];
    expect(entities).toEqual(expected);
  });

  test('it returns true for a found entity name passed in', () => {
    anomalies.anomalies[0].entityName = 'user.name';
    anomalies.anomalies[0].entityValue = 'admin';
    const found = getUserNameFromEntity(anomalies.anomalies[0], 'admin');
    expect(found).toEqual(true);
  });

  test('it returns false for an entity name that does not exist', () => {
    anomalies.anomalies[0].entityName = 'user.name';
    anomalies.anomalies[0].entityValue = 'admin';
    const found = getUserNameFromEntity(anomalies.anomalies[0], 'some-made-up-entity-name');
    expect(found).toEqual(false);
  });

  test('it returns true for an entity that has user.name within it if no name is passed in', () => {
    anomalies.anomalies[0].entityName = 'user.name';
    anomalies.anomalies[0].entityValue = 'something-made-up';
    const found = getUserNameFromEntity(anomalies.anomalies[0]);
    expect(found).toEqual(true);
  });

  test('it returns false for an entity that is not user.name and no name is passed in', () => {
    anomalies.anomalies[0].entityName = 'made-up';
    const found = getUserNameFromEntity(anomalies.anomalies[0]);
    expect(found).toEqual(false);
  });
});
