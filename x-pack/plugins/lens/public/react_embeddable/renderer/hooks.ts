/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import { useEffect, useMemo, useRef } from 'react';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { dispatchRenderComplete, dispatchRenderStart } from '@kbn/kibana-utils-plugin/public';
import { LensApi, LensInternalApi } from '../types';

/**
 * This hooks known how to extract message based on types for the UI
 */
export function useMessages({ messages$ }: LensInternalApi) {
  const latestMessages = useStateFromPublishingSubject(messages$);
  return useMemo(
    () => partition(latestMessages, ({ severity }) => severity !== 'info'),
    [latestMessages]
  );
}

/**
 * This hook is responsible to emit the render start/complete JS event
 * The render error is handled by the data_loader itself when updating the blocking errors
 */
export function useDispatcher(hasRendered: boolean, api: LensApi) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!rootRef.current || api.blockingError?.getValue()) {
      return;
    }
    if (hasRendered) {
      dispatchRenderComplete(rootRef.current);
    } else {
      dispatchRenderStart(rootRef.current);
    }
  }, [hasRendered, api.blockingError, rootRef]);
  return rootRef;
}
