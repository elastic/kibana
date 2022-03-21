/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  KibanaRequest,
  IScopedClusterClient,
} from 'kibana/server';
import type { DataViewsService } from '../../../../../../src/plugins/data_views/common';
import type { Module } from '../../../common/types/modules';
import { DataRecognizer } from '../data_recognizer';
import type { MlClient } from '../../lib/ml_client';
import type { MLSavedObjectService } from '../../saved_objects';

const callAs = () => Promise.resolve({ body: {} });

const mlClusterClient = {
  asCurrentUser: callAs,
  asInternalUser: callAs,
} as unknown as IScopedClusterClient;

const mlClient = callAs as unknown as MlClient;

describe('ML - data recognizer', () => {
  const dr = new DataRecognizer(
    mlClusterClient,
    mlClient,
    {
      find: jest.fn(),
      bulkCreate: jest.fn(),
    } as unknown as SavedObjectsClientContract,
    { find: jest.fn() } as unknown as DataViewsService,
    {} as MLSavedObjectService,
    { headers: { authorization: '' } } as unknown as KibanaRequest
  );

  describe('jobOverrides', () => {
    it('should apply job overrides correctly', () => {
      // arrange
      const prefix = 'pre-';
      const testJobId = 'test-job';
      const moduleConfig = {
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
      } as unknown as Module;
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
