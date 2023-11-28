/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlSummaryJob } from '@kbn/ml-plugin/public';
import { useMemo } from 'react';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import { isSecurityJob } from '../../../../../common/machine_learning/is_security_job';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import * as i18n from '../translations';
import { useFetchJobsSummaryQuery } from './use_fetch_jobs_summary_query';
import { useMlCapabilities } from './use_ml_capabilities';

export interface UseInstalledSecurityJobsReturn {
  loading: boolean;
  jobs: MlSummaryJob[];
  isMlUser: boolean;
  isLicensed: boolean;
}

/**
 * Returns a collection of installed ML jobs (MlSummaryJob) relevant to
 * Security Solution, i.e. all installed jobs in the `security` ML group.
 * Use the corresponding helper functions to filter the job list as
 * necessary (running jobs, etc).
 *
 * NOTE: If you need to include jobs that are not currently installed, try the
 * {@link useSecurityJobs} hook.
 *
 */
export const useInstalledSecurityJobs = (): UseInstalledSecurityJobsReturn => {
  const { addError } = useAppToasts();
  const mlCapabilities = useMlCapabilities();
  const isMlUser = hasMlUserPermissions(mlCapabilities);
  const isLicensed = hasMlLicense(mlCapabilities);

  const { isFetching, data: jobs = [] } = useFetchJobsSummaryQuery(
    {},
    {
      enabled: isMlUser && isLicensed,
      onError: (error) => {
        addError(error, { title: i18n.SIEM_JOB_FETCH_FAILURE });
      },
    }
  );

  const securityJobs = jobs.filter(isSecurityJob);

  return { isLicensed, isMlUser, jobs: securityJobs, loading: isFetching };
};

export const useInstalledSecurityJobsIds = () => {
  const { jobs, loading } = useInstalledSecurityJobs();
  const jobIds = useMemo(() => jobs.map((job) => job.id), [jobs]);

  return { jobIds, loading };
};

export const useInstalledSecurityJobNameById = () => {
  const { jobs, loading } = useInstalledSecurityJobs();

  const jobNameById = useMemo(
    () =>
      jobs.reduce<Record<string, string | undefined>>((acc, job) => {
        acc[job.id] = job.customSettings?.security_app_display_name;
        return acc;
      }, {}),
    [jobs]
  );

  return { jobNameById, loading };
};
