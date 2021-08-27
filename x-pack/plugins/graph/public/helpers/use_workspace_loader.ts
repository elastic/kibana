/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface UseWorkspaceLoaderProps {
  urlQuery: string | null;
  loadWorkspace: () => void;
  resetStore: () => void;
}

export const useWorkspaceLoader = ({
  urlQuery,
  loadWorkspace,
  resetStore,
}: UseWorkspaceLoaderProps) => {
  const location = useLocation();
  const prevLocationRef = useRef<{ pathname: string; query: string | null }>();

  useEffect(() => {
    const prevLocation = prevLocationRef.current;
    // Load workspace after initial render
    if (!prevLocation) {
      loadWorkspace();
    } else if (location.pathname !== prevLocation.pathname || prevLocation.query !== urlQuery) {
      // Clean up store after navigating to a new workspace.
      // Otherwise, in case of switching between workspaces, load it.
      if (location.pathname === '/workspace/') {
        resetStore();
      } else {
        loadWorkspace();
      }
    }

    prevLocationRef.current = {
      pathname: location.pathname,
      query: urlQuery,
    };
  }, [loadWorkspace, location, resetStore, urlQuery]);
};
