/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useMemo } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

import { getLinksWithHiddenTimeline } from '../../links';
import { useIsGroupedNavigationEnabled } from '../../components/navigation/helpers';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useSourcererDataView } from '../../containers/sourcerer';

const DEPRECATED_HIDDEN_TIMELINE_ROUTES: readonly string[] = [
  `/cases/configure`,
  '/administration',
  '/rules/create',
  '/get_started',
  '/explore',
  '/dashboards',
  '/manage',
];

const isTimelineHidden = (currentPath: string, isGroupedNavigationEnabled: boolean): boolean => {
  const groupLinksWithHiddenTimelinePaths = getLinksWithHiddenTimeline().map((l) => l.path);

  const hiddenTimelineRoutes = isGroupedNavigationEnabled
    ? groupLinksWithHiddenTimelinePaths
    : DEPRECATED_HIDDEN_TIMELINE_ROUTES;

  return !!hiddenTimelineRoutes.find((route) => matchPath(currentPath, route));
};

export const useShowTimeline = () => {
  const isGroupedNavigationEnabled = useIsGroupedNavigationEnabled();
  const { pathname } = useLocation();
  const { indicesExist, dataViewId } = useSourcererDataView(SourcererScopeName.timeline);

  const [isTimelinePath, setIsTimelinePath] = useState(
    !isTimelineHidden(pathname, isGroupedNavigationEnabled)
  );

  useEffect(() => {
    setIsTimelinePath(!isTimelineHidden(pathname, isGroupedNavigationEnabled));
  }, [pathname, isGroupedNavigationEnabled]);

  const showTimeline = useMemo(
    () => isTimelinePath && (dataViewId === null || indicesExist),
    [isTimelinePath, indicesExist, dataViewId]
  );

  return [showTimeline];
};
