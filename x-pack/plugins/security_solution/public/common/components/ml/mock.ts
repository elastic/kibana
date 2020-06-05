/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Anomalies } from './types';

export const mockAnomalies: Anomalies = {
  anomalies: [
    {
      time: new Date('2019-06-16T06:00:00.000Z').valueOf(),
      source: {
        job_id: 'job-1',
        result_type: 'record',
        probability: 0.024041164411288146,
        multi_bucket_impact: 0,
        record_score: 16.193669439507826,
        initial_record_score: 16.193669439507826,
        bucket_span: 900,
        detector_index: 0,
        is_interim: false,
        timestamp: new Date('2019-06-16T06:00:00.000Z').valueOf(),
        by_field_name: 'process.name',
        by_field_value: 'du',
        partition_field_name: 'host.name',
        partition_field_value: 'zeek-iowa',
        function: 'rare',
        function_description: 'rare',
        typical: [0.024041164411288146],
        actual: [1],
        influencers: [
          {
            influencer_field_name: 'user.name',
            influencer_field_values: ['root'],
          },
          {
            influencer_field_name: 'process.name',
            influencer_field_values: ['du'],
          },
          {
            influencer_field_name: 'host.name',
            influencer_field_values: ['zeek-iowa'],
          },
        ],
      },
      rowId: '1561157194802_0',
      jobId: 'job-1',
      detectorIndex: 0,
      severity: 16.193669439507826,
      entityName: 'process.name',
      entityValue: 'du',
      influencers: [
        {
          'host.name': 'zeek-iowa',
        },
        {
          'process.name': 'du',
        },
        {
          'user.name': 'root',
        },
      ],
    },
    {
      time: new Date('2019-06-16T06:00:00.000Z').valueOf(),
      source: {
        job_id: 'job-2',
        result_type: 'record',
        probability: 0.024041164411288146,
        multi_bucket_impact: 0,
        record_score: 16.193669439507826,
        initial_record_score: 16.193669439507826,
        bucket_span: 900,
        detector_index: 0,
        is_interim: false,
        timestamp: new Date('2019-06-16T06:00:00.000Z').valueOf(),
        by_field_name: 'process.name',
        by_field_value: 'ls',
        partition_field_name: 'host.name',
        partition_field_value: 'zeek-iowa',
        function: 'rare',
        function_description: 'rare',
        typical: [0.024041164411288146],
        actual: [1],
        influencers: [
          {
            influencer_field_name: 'user.name',
            influencer_field_values: ['root'],
          },
          {
            influencer_field_name: 'process.name',
            influencer_field_values: ['ls'],
          },
          {
            influencer_field_name: 'host.name',
            influencer_field_values: ['zeek-iowa'],
          },
        ],
      },
      rowId: '1561157194802_1',
      jobId: 'job-2',
      detectorIndex: 0,
      severity: 16.193669439507826,
      entityName: 'process.name',
      entityValue: 'ls',
      influencers: [
        {
          'host.name': 'zeek-iowa',
        },
        {
          'process.name': 'ls',
        },
        {
          'user.name': 'root',
        },
      ],
    },
  ],
  interval: 'day',
};
