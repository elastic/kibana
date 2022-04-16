/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { MlSummaryJob } from '@kbn/ml-plugin/public';
import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { isSecurityJob } from '../../../../../common/machine_learning/is_security_job';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useHttp } from '../../../lib/kibana';
import { useMlCapabilities } from './use_ml_capabilities';
import * as i18n from '../translations';
import { useGetJobsSummary } from './use_get_jobs_summary';

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
  const [jobs, setJobs] = useState<MlSummaryJob[]>([]);
  const { addError } = useAppToasts();
  const mlCapabilities = useMlCapabilities();
  const http = useHttp();
  const { error, loading, result, start } = useGetJobsSummary();

  const isMlUser = hasMlUserPermissions(mlCapabilities);
  const isLicensed = hasMlLicense(mlCapabilities);

  useEffect(() => {
    if (isMlUser && isLicensed) {
      start({ http });
    }
  }, [http, isMlUser, isLicensed, start]);

  useEffect(() => {
    if (result) {
      const securityJobs = result.filter(isSecurityJob);
      setJobs(securityJobs);
    }
  }, [result]);

  useEffect(() => {
    if (error) {
      addError(error, { title: i18n.SIEM_JOB_FETCH_FAILURE });
    }
  }, [addError, error]);

  return { isLicensed, isMlUser, jobs, loading };
};
