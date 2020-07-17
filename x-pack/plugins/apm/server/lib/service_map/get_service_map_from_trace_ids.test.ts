/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getConnections } from './get_service_map_from_trace_ids';
import serviceMapFromTraceIdsScriptResponse from './mock_responses/get_service_map_from_trace_ids_script_response.json';
import { PromiseReturnType } from '../../../typings/common';
import { fetchServicePathsFromTraceIds } from './fetch_service_paths_from_trace_ids';

describe('getConnections', () => {
  it('transforms a list of paths into a list of connections filtered by service.name and environment', () => {
    const response = serviceMapFromTraceIdsScriptResponse as PromiseReturnType<
      typeof fetchServicePathsFromTraceIds
    >;
    const serviceName = 'opbeans-node';
    const environment = 'production';

    const connections = getConnections(
      response.aggregations?.service_map.value.paths,
      serviceName,
      environment
    );

    expect(connections).toMatchSnapshot();
  });
});
