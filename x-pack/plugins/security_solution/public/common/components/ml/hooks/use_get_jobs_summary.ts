/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useAsync, withOptionalSignal } from '../../../../shared_imports';
import { getJobsSummary } from '../api/get_jobs_summary';

const _getJobsSummary = withOptionalSignal(getJobsSummary);

export const useGetJobsSummary = () => useAsync(_getJobsSummary);
