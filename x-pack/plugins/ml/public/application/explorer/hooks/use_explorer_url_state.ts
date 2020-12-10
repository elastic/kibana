/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { usePageUrlState } from '../../util/url_state';
import { ExplorerAppState } from '../../../../common/types/ml_url_generator';
import { ML_PAGES } from '../../../../common/constants/ml_url_generator';

export function useExplorerUrlState() {
  return usePageUrlState<ExplorerAppState>(ML_PAGES.ANOMALY_EXPLORER);
}
