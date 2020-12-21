/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { usePageUrlState } from '../../util/url_state';
import { ExplorerAppState } from '../../../../common/types/ml_url_generator';
import { ML_PAGES } from '../../../../common/constants/ml_url_generator';

export function useExplorerUrlState() {
  /**
   * Originally `mlExplorerSwimlane` resided directly in the app URL state (`_a` URL state key).
   * With current URL structure it has been moved under the `explorer` key of the app state (_a).
   */
  const [legacyExplorerState] = usePageUrlState<ExplorerAppState['mlExplorerSwimlane']>(
    'mlExplorerSwimlane'
  );

  return usePageUrlState<ExplorerAppState>(ML_PAGES.ANOMALY_EXPLORER, {
    mlExplorerSwimlane: legacyExplorerState,
    mlExplorerFilter: {},
  });
}
