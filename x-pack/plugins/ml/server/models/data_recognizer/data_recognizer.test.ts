/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, KibanaRequest } from 'kibana/server';
import { Module } from '../../../common/types/modules';
import { DataRecognizer } from '../data_recognizer';

describe('ML - data recognizer', () => {
  const dr = new DataRecognizer(
    { callAsCurrentUser: jest.fn(), callAsInternalUser: jest.fn() },
    ({
      find: jest.fn(),
      bulkCreate: jest.fn(),
    } as unknown) as SavedObjectsClientContract,
    { headers: { authorization: '' } } as KibanaRequest
  );

  describe('jobOverrides', () => {
    it('should apply job overrides correctly', () => {
      // arrange
      const prefix = 'pre-';
      const testJobId = 'test-job';
      const moduleConfig = ({
        jobs: [
          {
            id: `${prefix}${testJobId}`,
            config: {
              groups: ['nginx'],
              analysis_config: {
                bucket_span: '1h',
              },
              analysis_limits: {
                model_memory_limit: '256mb',
                influencers: ['region'],
              },
              calendars: ['calendar-1'],
            },
          },
        ],
      } as unknown) as Module;
      const jobOverrides = [
        {
          analysis_limits: {
            model_memory_limit: '512mb',
            influencers: [],
          },
        },
        {
          job_id: testJobId,
          groups: [],
        },
      ];
      // act
      dr.applyJobConfigOverrides(moduleConfig, jobOverrides, prefix);
      // assert
      expect(moduleConfig.jobs).toEqual([
        {
          config: {
            analysis_config: {
              bucket_span: '1h',
            },
            analysis_limits: {
              model_memory_limit: '512mb',
              influencers: [],
            },
            groups: [],
            calendars: ['calendar-1'],
          },
          id: 'pre-test-job',
        },
      ]);
    });
  });
});
