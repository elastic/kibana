/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import { KibanaServices } from '../../../common/lib/kibana';
import { ActionDetailsApiResponse } from '../../../../common/endpoint/types';
import { ACTION_DETAILS_ROUTE } from '../../../../common/endpoint/constants';

/**
 * Fetch Details about an endpoint action
 * @param actionId
 */
export const fetchActionDetails = (actionId: string): Promise<ActionDetailsApiResponse> => {
  const http = KibanaServices.get().http;
  return http.get<ActionDetailsApiResponse>(
    resolvePathVariables(ACTION_DETAILS_ROUTE, {
      action_id: actionId,
    })
  );
};
