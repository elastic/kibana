/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { map } from 'rxjs';
import type { KibanaExecutionContext } from '@kbn/core/types';
import { useMemo } from 'react';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import type { Observable } from 'rxjs';
import type { EmbeddableInput } from '@kbn/embeddable-plugin/common';
import type { ExecutionContextStart } from '@kbn/core/public';

/**
 * Use execution context for ML embeddables.
 * @param executionContext
 * @param embeddableInput$
 * @param embeddableType
 * @param id
 */
export function useEmbeddableExecutionContext<T extends EmbeddableInput>(
  executionContext: ExecutionContextStart,
  embeddableInput$: Observable<T>,
  embeddableType: string,
  id: string
) {
  const parentExecutionContext = useObservable(
    embeddableInput$.pipe(map((v) => v.executionContext))
  );

  const embeddableExecutionContext: KibanaExecutionContext = useMemo(() => {
    const child: KibanaExecutionContext = {
      type: 'visualization',
      name: embeddableType,
      id,
    };

    return {
      ...parentExecutionContext,
      child,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentExecutionContext, id]);

  useExecutionContext(executionContext, embeddableExecutionContext);
}
