/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flow, set } from 'lodash/fp';

import { InfraResponse } from '../../../../common/graphql/types';
import { InfraNodeRequestOptions } from './adapter_types';

const formatGroupBy = (options: InfraNodeRequestOptions) => (response: InfraResponse) => {
  if (options.groupBy.length > 0 && (response.groups == null || response.groups.length === 0)) {
    return set('groups', [], response);
  }
  return response;
};

const formatNodesKey = (options: InfraNodeRequestOptions) => (response: InfraResponse) => {
  if (response[options.nodesKey] == null) {
    return set(options.nodesKey, [], response);
  }
  return response;
};

export const formatResponse = (
  options: InfraNodeRequestOptions,
  resp: InfraResponse
): InfraResponse => {
  return flow(formatGroupBy(options), formatNodesKey(options))(resp);
};
