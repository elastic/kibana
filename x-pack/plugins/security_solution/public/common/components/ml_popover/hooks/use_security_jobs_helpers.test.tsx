/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  composeModuleAndInstalledJobs,
  createSecurityJobs,
  getAugmentedFields,
  getInstalledJobs,
  getModuleJobs,
  moduleToSecurityJob,
} from './use_security_jobs_helpers';
import {
  checkRecognizerSuccess,
  mockGetModuleResponse,
  mockJobsSummaryResponse,
} from '../api.mock';
import type { SecurityJob } from '../types';

// TODO: Expand test coverage

describe('useSecurityJobsHelpers', () => {
  describe('moduleToSecurityJob', () => {
    test('correctly converts module to SecurityJob', () => {
      const securityJob = moduleToSecurityJob(
        mockGetModuleResponse[0],
        mockGetModuleResponse[0].jobs[0],
        false
      );
      expect(securityJob).toEqual({
        awaitingNodeAssignment: false,
        bucketSpanSeconds: 900,
        datafeedId: '',
        datafeedIndices: [],
        datafeedState: '',
        defaultIndexPattern: 'auditbeat-*',
        description: 'SIEM Auditbeat: Detect unusually rare processes on Linux (beta)',
        groups: ['auditbeat', 'process', 'siem'],
        hasDatafeed: false,
        id: 'rare_process_by_host_linux',
        isCompatible: false,
        isElasticJob: true,
        isInstalled: false,
        isSingleMetricViewerJob: false,
        jobState: 'closed',
        jobTags: {},
        memory_status: '',
        moduleId: 'security_linux_v3',
        processed_record_count: 0,
        customSettings: {
          created_by: 'ml-module-siem-auditbeat',
          custom_urls: [
            {
              url_name: 'Host Details by process name',
              url_value:
                "siem#/ml-hosts/$host.name$?kqlQuery=(filterQuery:(expression:'process.name%20:%20%22$process.name$%22',kind:kuery),queryLocation:hosts.details,type:details)&timerange=(global:(linkTo:!(timeline),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')),timeline:(linkTo:!(global),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')))",
            },
            {
              url_name: 'Host Details by user name',
              url_value:
                "siem#/ml-hosts/$host.name$?kqlQuery=(filterQuery:(expression:'user.name%20:%20%22$user.name$%22',kind:kuery),queryLocation:hosts.details,type:details)&timerange=(global:(linkTo:!(timeline),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')),timeline:(linkTo:!(global),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')))",
            },
            {
              url_name: 'Hosts Overview by process name',
              url_value:
                "siem#/ml-hosts?kqlQuery=(filterQuery:(expression:'process.name%20:%20%22$process.name$%22',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')),timeline:(linkTo:!(global),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')))",
            },
            {
              url_name: 'Hosts Overview by user name',
              url_value:
                "siem#/ml-hosts?kqlQuery=(filterQuery:(expression:'user.name%20:%20%22$user.name$%22',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')),timeline:(linkTo:!(global),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')))",
            },
          ],
        },
      });
    });

    describe('getAugmentedFields', () => {
      test('return correct augmented fields for global ml jobs', () => {
        const moduleJobs = getModuleJobs(mockGetModuleResponse, ['security_linux_v3']);
        const augmentedFields = getAugmentedFields(
          'rare_process_by_host_linux',
          moduleJobs,
          ['security_linux_v3'],
          'space-id'
        );
        expect(augmentedFields).toEqual({
          defaultIndexPattern: 'auditbeat-*',
          isCompatible: true,
          isElasticJob: true,
          moduleId: 'security_linux_v3',
        });
      });

      test('return correct augmented fields for space aware jobs', () => {
        const spaceId = 'test-space-id';
        const moduleJobs = getModuleJobs(mockGetModuleResponse, ['security_linux_v3']);
        const augmentedFields = getAugmentedFields(
          `${spaceId}_rare_process_by_host_linux`,
          moduleJobs,
          ['security_linux_v3'],
          spaceId
        );
        expect(augmentedFields).toEqual({
          defaultIndexPattern: 'auditbeat-*',
          isCompatible: true,
          isElasticJob: true,
          moduleId: 'security_linux_v3',
        });
      });
    });

    describe('getModuleJobs', () => {
      test('returns all jobs within a module for a compatible moduleId', () => {
        const moduleJobs = getModuleJobs(mockGetModuleResponse, ['security_linux_v3']);
        expect(moduleJobs.length).toEqual(3);
      });
    });

    describe('getInstalledJobs', () => {
      test('returns all jobs from jobSummary for a compatible moduleId', () => {
        const moduleJobs = getModuleJobs(mockGetModuleResponse, ['security_linux_v3']);
        const installedJobs = getInstalledJobs(
          mockJobsSummaryResponse,
          moduleJobs,
          ['security_linux_v3'],
          'spaceId'
        );
        expect(installedJobs.length).toEqual(3);
      });
    });

    describe('composeModuleAndInstalledJobs', () => {
      test('returns correct number of jobs when composing separate module and installed jobs', () => {
        const moduleJobs = getModuleJobs(mockGetModuleResponse, ['security_linux_v3']);
        const installedJobs = getInstalledJobs(
          mockJobsSummaryResponse,
          moduleJobs,
          ['security_linux_v3'],
          'spaceId'
        );
        const securityJobs = composeModuleAndInstalledJobs(
          installedJobs,
          moduleJobs,
          'testSpaceId'
        );
        expect(securityJobs.length).toEqual(6);
      });

      test('filters out module job when the job id matches a installed job id (jobs installed before 8.8)', () => {
        const installedJob = mockJob('test_job');
        const moduleJob = mockJob('test_job');
        const securityJobs = composeModuleAndInstalledJobs(
          [installedJob],
          [moduleJob],
          'testSpaceId'
        );
        expect(securityJobs.length).toEqual(1);
      });

      test('filters out module job when the job id matches a installed job id (jobs installed after 8.8)', () => {
        const installedJob = mockJob('testSpaceId_test_job');
        const moduleJob = mockJob('test_job');
        const securityJobs = composeModuleAndInstalledJobs(
          [installedJob],
          [moduleJob],
          'testSpaceId'
        );
        expect(securityJobs.length).toEqual(1);
      });
    });

    describe('createSecurityJobs', () => {
      test('returns correct number of jobs when creating jobs with successful responses', () => {
        const securityJobs = createSecurityJobs(
          mockJobsSummaryResponse,
          mockGetModuleResponse,
          checkRecognizerSuccess,
          'testSpaceId'
        );
        expect(securityJobs.length).toEqual(6);
      });
    });
  });
});

const mockJob = (id: string): SecurityJob => ({
  moduleId: '',
  defaultIndexPattern: '',
  isCompatible: false,
  isInstalled: false,
  isElasticJob: false,
  id,
  description: '',
  groups: [],
  jobState: 'closed',
  datafeedIndices: [],
  hasDatafeed: false,
  datafeedId: '',
  datafeedState: '',
  isSingleMetricViewerJob: false,
  awaitingNodeAssignment: false,
  jobTags: {},
  bucketSpanSeconds: 0,
});
