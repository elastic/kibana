/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { ResolverState } from '../types';
import { SafeResolverEvent } from '../../../common/endpoint/types';
import * as selectors from '../store/selectors';

/**
 * @deprecated
 */
export function useRelatedEventDetailNavigation({
  nodeID,
  category,
  events,
}: {
  nodeID: string;
  category: string;
  events: SafeResolverEvent[];
}) {
  const relatedEventDetailUrls = useSelector((state: ResolverState) =>
    selectors.relatedEventDetailHrefs(state)(category, nodeID, events)
  );
  const history = useHistory();
  return useCallback(
    (entityID: string | number | undefined) => {
      if (entityID !== undefined) {
        const urlForEntityID = relatedEventDetailUrls.get(String(entityID));
        if (urlForEntityID !== null && urlForEntityID !== undefined) {
          return history.replace({ search: urlForEntityID });
        }
      }
    },
    [history, relatedEventDetailUrls]
  );
}
