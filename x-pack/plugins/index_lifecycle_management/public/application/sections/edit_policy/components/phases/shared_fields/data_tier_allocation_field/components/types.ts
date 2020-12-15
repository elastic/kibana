/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ListNodesRouteResponse,
  PhaseWithAllocation,
} from '../../../../../../../../../common/types';

export interface SharedProps {
  phase: PhaseWithAllocation;
  nodes: ListNodesRouteResponse['nodesByAttributes'];
  hasNodeAttributes: boolean;
  /**
   * When on Cloud we want to disable the data tier allocation option when we detect that we are not
   * using node roles in our Node config yet. See {@link ListNodesRouteResponse} for information about how this is
   * detected.
   */
  disableDataTierOption: boolean;
  /**
   * A flag to indicate whether input fields should be showing a loading spinner
   */
  isLoading: boolean;
}
