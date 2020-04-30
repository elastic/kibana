/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  composeModuleAndInstalledJobs,
  createSiemJobs,
  getAugmentedFields,
  getInstalledJobs,
  getModuleJobs,
  moduleToSiemJob,
} from './use_siem_jobs_helpers';
import {
  checkRecognizerSuccess,
  mockGetModuleResponse,
  mockJobsSummaryResponse,
} from '../__mocks__/api';

// TODO: Expand test coverage

describe('useSiemJobsHelpers', () => {
  describe('moduleToSiemJob', () => {
    test('correctly converts module to SiemJob', () => {
      const siemJob = moduleToSiemJob(
        mockGetModuleResponse[0],
        mockGetModuleResponse[0].jobs[0],
        false
      );
      expect(siemJob).toEqual({
        datafeedId: '',
        datafeedIndices: [],
        datafeedState: '',
        defaultIndexPattern: 'auditbeat-*',
        description: 'SIEM Auditbeat: Detect unusually rare processes on Linux (beta)',
        groups: ['auditbeat', 'process', 'siem'],
        hasDatafeed: false,
        id: 'rare_process_by_host_linux_ecs',
        isCompatible: false,
        isElasticJob: true,
        isInstalled: false,
        isSingleMetricViewerJob: false,
        jobState: '',
        memory_status: '',
        moduleId: 'siem_auditbeat',
        processed_record_count: 0,
      });
    });

    describe('getAugmentedFields', () => {
      test('return correct augmented fields for given matching compatible modules', () => {
        const moduleJobs = getModuleJobs(mockGetModuleResponse, ['siem_auditbeat']);
        const augmentedFields = getAugmentedFields('rare_process_by_host_linux_ecs', moduleJobs, [
          'siem_auditbeat',
        ]);
        expect(augmentedFields).toEqual({
          defaultIndexPattern: 'auditbeat-*',
          isCompatible: true,
          isElasticJob: true,
          moduleId: 'siem_auditbeat',
        });
      });
    });

    describe('getModuleJobs', () => {
      test('returns all jobs within a module for a compatible moduleId', () => {
        const moduleJobs = getModuleJobs(mockGetModuleResponse, ['siem_auditbeat']);
        expect(moduleJobs.length).toEqual(3);
      });
    });

    describe('getInstalledJobs', () => {
      test('returns all jobs from jobSummary for a compatible moduleId', () => {
        const moduleJobs = getModuleJobs(mockGetModuleResponse, ['siem_auditbeat']);
        const installedJobs = getInstalledJobs(mockJobsSummaryResponse, moduleJobs, [
          'siem_auditbeat',
        ]);
        expect(installedJobs.length).toEqual(3);
      });
    });

    describe('composeModuleAndInstalledJobs', () => {
      test('returns correct number of jobs when composing separate module and installed jobs', () => {
        const moduleJobs = getModuleJobs(mockGetModuleResponse, ['siem_auditbeat']);
        const installedJobs = getInstalledJobs(mockJobsSummaryResponse, moduleJobs, [
          'siem_auditbeat',
        ]);
        const siemJobs = composeModuleAndInstalledJobs(installedJobs, moduleJobs);
        expect(siemJobs.length).toEqual(6);
      });
    });

    describe('createSiemJobs', () => {
      test('returns correct number of jobs when creating jobs with successful responses', () => {
        const siemJobs = createSiemJobs(
          mockJobsSummaryResponse,
          mockGetModuleResponse,
          checkRecognizerSuccess
        );
        expect(siemJobs.length).toEqual(6);
      });
    });
  });
});
