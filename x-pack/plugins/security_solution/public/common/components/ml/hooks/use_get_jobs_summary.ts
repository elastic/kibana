/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAsync, withOptionalSignal } from '@kbn/securitysolution-hook-utils';
import { getJobsSummary } from '../api/get_jobs_summary';

const _getJobsSummary = withOptionalSignal(getJobsSummary);

// TODO rewrite to react-query
export const useGetJobsSummary = () => useAsync(_getJobsSummary);
