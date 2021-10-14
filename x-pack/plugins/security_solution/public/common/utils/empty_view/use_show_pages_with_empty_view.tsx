/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { useRouteSpy } from '../route/use_route_spy';
import { SecurityPageName } from '../../../app/types';
import { useSourcererScope } from '../../../common/containers/sourcerer';

export const useShowPagesWithEmptyView = () => {
  const [{ pageName }] = useRouteSpy();
  const { indicesExist } = useSourcererScope();

  // Used to detect if we're on a top level page that is empty and set page background color to match the subdued Empty State
  const isPageNameWithEmptyView = (currentName: string) => {
    const pageNamesWithEmptyView: string[] = [
      SecurityPageName.hosts,
      SecurityPageName.network,
      SecurityPageName.timelines,
      SecurityPageName.overview,
    ];
    return pageNamesWithEmptyView.includes(currentName);
  };

  const [showEmptyState, setShowEmptyState] = useState(
    isPageNameWithEmptyView(pageName) && !indicesExist
  );

  useEffect(() => {
    if (isPageNameWithEmptyView(pageName) && !indicesExist) {
      setShowEmptyState(true);
    } else {
      setShowEmptyState(false);
    }
  }, [pageName, indicesExist]);

  return [showEmptyState];
};
