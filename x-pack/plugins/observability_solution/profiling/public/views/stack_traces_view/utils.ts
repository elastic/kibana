/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/typed-react-router-config';
import { getFieldNameForTopNType, TopNType } from '@kbn/profiling-utils';
import { ProfilingRoutes } from '../../routing';

export function getTracesViewRouteParams({
  query,
  topNType,
  category,
}: {
  query: TypeOf<ProfilingRoutes, '/stacktraces/{topNType}'>['query'];
  topNType: TopNType;
  category: string;
}) {
  return {
    path: { topNType: TopNType.Traces },
    query: {
      ...query,
      kuery: `${query.kuery ? `(${query.kuery}) AND ` : ''}${getFieldNameForTopNType(
        topNType
      )}:"${category}"`,
    },
  };
}
