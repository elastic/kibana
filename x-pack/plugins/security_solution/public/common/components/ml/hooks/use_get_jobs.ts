/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useAsync, withOptionalSignal } from '@kbn/securitysolution-hook-utils';
import type { CombinedJobWithStats } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import { getJobs } from '../api/get_jobs';

import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useHttp } from '../../../lib/kibana';
import { useMlCapabilities } from './use_ml_capabilities';
import * as i18n from '../translations';

const _getJobs = withOptionalSignal(getJobs);

export const useGetJobs = () => useAsync(_getJobs);

export interface UseGetInstalledJobReturn {
  loading: boolean;
  jobs: CombinedJobWithStats[];
  isMlUser: boolean;
  isLicensed: boolean;
}

// TODO react-query
export const useGetInstalledJob = (jobIds: string[]): UseGetInstalledJobReturn => {
  const [jobs, setJobs] = useState<CombinedJobWithStats[]>([]);
  const { addError } = useAppToasts();
  const mlCapabilities = useMlCapabilities();
  const http = useHttp();
  const { error, loading, result, start } = useGetJobs();

  const isMlUser = hasMlUserPermissions(mlCapabilities);
  const isLicensed = hasMlLicense(mlCapabilities);

  useEffect(() => {
    if (isMlUser && isLicensed && jobIds.length > 0) {
      start({ http, jobIds });
    }
  }, [http, isMlUser, isLicensed, start, jobIds]);

  useEffect(() => {
    if (result) {
      setJobs(result);
    }
  }, [result]);

  useEffect(() => {
    if (error) {
      addError(error, { title: i18n.SIEM_JOB_FETCH_FAILURE });
    }
  }, [addError, error]);

  return { isLicensed, isMlUser, jobs, loading };
};
