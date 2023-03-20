/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core/public';
import { getExecutionContext } from '../../../kibana_services';
import { makeExecutionContext } from '../../../../common/execution_context';

export function makeHierarchicalExecutionContext(description: string, savedObjectId?: string): KibanaExecutionContext {
  const topLevelContext = getExecutionContext().get();
  const context = makeExecutionContext({
    url: window.location.pathname,
    description,
    id: savedObjectId,
  });

  // Distinguish between running in maps app vs. embedded
  return topLevelContext.name !== undefined && topLevelContext.name !== context.name
    ? {
        ...topLevelContext,
        child: context,
      }
    : {
        ...topLevelContext,
        ...context,
      };
}
