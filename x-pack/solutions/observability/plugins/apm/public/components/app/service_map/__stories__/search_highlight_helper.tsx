/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  ServiceMapSearchProvider,
  useServiceMapSearchContext,
} from '../../../shared/service_map/service_map_search_context';

interface SearchHighlightProps {
  matchNodeIds: Set<string>;
  activeMatchNodeId: string | null;
  children: React.ReactNode;
}

function SearchHighlightInit({ matchNodeIds, activeMatchNodeId, children }: SearchHighlightProps) {
  const { setSearchHighlight } = useServiceMapSearchContext();
  useEffect(() => {
    setSearchHighlight({ matchNodeIds, activeMatchNodeId });
  }, [matchNodeIds, activeMatchNodeId, setSearchHighlight]);
  return <>{children}</>;
}

/**
 * Wraps children in a fresh `ServiceMapSearchProvider` pre-configured with the given highlight state.
 */
export function WithSearchHighlight({
  matchNodeIds,
  activeMatchNodeId,
  children,
}: SearchHighlightProps) {
  return (
    <ServiceMapSearchProvider>
      <SearchHighlightInit matchNodeIds={matchNodeIds} activeMatchNodeId={activeMatchNodeId}>
        {children}
      </SearchHighlightInit>
    </ServiceMapSearchProvider>
  );
}
