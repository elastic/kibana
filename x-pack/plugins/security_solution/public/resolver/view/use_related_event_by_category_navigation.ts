/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { ResolverState } from '../types';
import * as selectors from '../store/selectors';

/**
 * A hook that takes a nodeID and a record of categories, and returns a function that
 * navigates to the proper url when called with a category.
 * @deprecated See `useLinkProps`
 */
export function useRelatedEventByCategoryNavigation({
  nodeID,
  categories,
}: {
  nodeID: string;
  categories: Record<string, number> | undefined;
}) {
  const relatedEventUrls = useSelector((state: ResolverState) =>
    selectors.relatedEventsRelativeHrefs(state)(categories, nodeID)
  );
  const history = useHistory();
  return useCallback(
    (category: string) => {
      const urlForCategory = relatedEventUrls.get(category);
      if (urlForCategory !== null && urlForCategory !== undefined) {
        return history.replace({ search: urlForCategory });
      }
    },
    [history, relatedEventUrls]
  );
}
