/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useAppToastsMock } from '../../../hooks/use_app_toasts.mock';
import { getJobsSummary } from '../../ml/api/get_jobs_summary';
import { checkRecognizer, getModules } from '../api';
import { SecurityJob } from '../types';
import {
  mockJobsSummaryResponse,
  mockGetModuleResponse,
  checkRecognizerSuccess,
} from '../api.mock';
import { useSecurityJobs } from './use_security_jobs';

jest.mock('../../../../../common/machine_learning/has_ml_admin_permissions');
jest.mock('../../../../../common/machine_learning/has_ml_license');
jest.mock('../../../lib/kibana');
jest.mock('../../../hooks/use_app_toasts');
jest.mock('../../ml/hooks/use_ml_capabilities');
jest.mock('../../ml/api/get_jobs_summary');
jest.mock('../api');

describe('useSecurityJobs', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
  });

  describe('when user has valid permissions', () => {
    beforeEach(() => {
      (hasMlAdminPermissions as jest.Mock).mockReturnValue(true);
      (hasMlLicense as jest.Mock).mockReturnValue(true);
      (getJobsSummary as jest.Mock).mockResolvedValue(mockJobsSummaryResponse);
      (getModules as jest.Mock).mockResolvedValue(mockGetModuleResponse);
      (checkRecognizer as jest.Mock).mockResolvedValue(checkRecognizerSuccess);
    });

    it.skip('combines multiple ML calls into an array of SecurityJobs', async () => {
      const expectedSecurityJob: SecurityJob = {
        datafeedId: 'datafeed-siem-api-rare_process_linux_ecs',
        datafeedIndices: ['auditbeat-*'],
        datafeedState: 'stopped',
        defaultIndexPattern: '',
        description: 'SIEM Auditbeat: Detect unusually rare processes on Linux (beta)',
        earliestTimestampMs: 1557353420495,
        groups: ['siem'],
        hasDatafeed: true,
        id: 'siem-api-rare_process_linux_ecs',
        isCompatible: true,
        isElasticJob: false,
        isInstalled: true,
        isSingleMetricViewerJob: true,
        jobState: 'closed',
        jobTags: {},
        latestTimestampMs: 1557434782207,
        memory_status: 'hard_limit',
        moduleId: '',
        processed_record_count: 582251,
        awaitingNodeAssignment: false,
        bucketSpanSeconds: 900,
      };

      const { result, waitForNextUpdate } = renderHook(() => useSecurityJobs(false));
      await waitForNextUpdate();

      expect(result.current.jobs).toHaveLength(6);
      expect(result.current.jobs).toEqual(expect.arrayContaining([expectedSecurityJob]));
    });

    it.skip('returns those permissions', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useSecurityJobs(false));
      await waitForNextUpdate();

      expect(result.current.isMlAdmin).toEqual(true);
      expect(result.current.isLicensed).toEqual(true);
    });

    it.skip('renders a toast error if an ML call fails', async () => {
      (getModules as jest.Mock).mockRejectedValue('whoops');
      const { waitForNextUpdate } = renderHook(() => useSecurityJobs(false));
      await waitForNextUpdate();

      expect(appToastsMock.addError).toHaveBeenCalledWith('whoops', {
        title: 'Security job fetch failure',
      });
    });
  });

  describe('when the user does not have valid permissions', () => {
    beforeEach(() => {
      (hasMlAdminPermissions as jest.Mock).mockReturnValue(false);
      (hasMlLicense as jest.Mock).mockReturnValue(false);
    });

    it.skip('returns empty jobs and false predicates', () => {
      const { result } = renderHook(() => useSecurityJobs(false));

      expect(result.current.jobs).toEqual([]);
      expect(result.current.isMlAdmin).toEqual(false);
      expect(result.current.isLicensed).toEqual(false);
    });
  });
});
