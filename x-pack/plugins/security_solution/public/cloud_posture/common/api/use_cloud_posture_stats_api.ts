/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { useKibana } from '../../../common/lib/kibana';
// TODO: find out how to import from the server folder without warnings
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { CloudPostureStats } from '../../../../server/cloud_posture/types';

export const useCloudPostureStatsApi = () => {
  const { http } = useKibana().services;
  return useQuery(['csp_dashboard_stats'], () => http.get<CloudPostureStats>('/api/csp/stats'));
};
