/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { matchPath } from 'react-router-dom';

import { getLinksWithHiddenTimeline } from '../../links';
import { useIsGroupedNavigationEnabled } from '../../components/navigation/helpers';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useSourcererDataView } from '../../containers/sourcerer';
import { useKibana } from '../../lib/kibana';

const DEPRECATED_HIDDEN_TIMELINE_ROUTES: readonly string[] = [
  `/cases/configure`,
  '/administration',
  '/rules/create',
  '/get_started',
  '/explore',
  '/dashboards',
  '/manage',
  '/cloud_security_posture*',
];

const isTimelinePathVisible = (
  currentPath: string,
  isGroupedNavigationEnabled: boolean
): boolean => {
  const groupLinksWithHiddenTimelinePaths = getLinksWithHiddenTimeline().map((l) => l.path);

  const hiddenTimelineRoutes = isGroupedNavigationEnabled
    ? groupLinksWithHiddenTimelinePaths
    : DEPRECATED_HIDDEN_TIMELINE_ROUTES;

  return !hiddenTimelineRoutes.find((route) => matchPath(currentPath, route));
};

export const useShowTimelineForGivenPath = () => {
  const isGroupedNavigationEnabled = useIsGroupedNavigationEnabled();

  const { indicesExist, dataViewId } = useSourcererDataView(SourcererScopeName.timeline);
  const userHasSecuritySolutionVisible = useKibana().services.application.capabilities.siem.show;

  const isTimelineAllowed = useMemo(
    () => userHasSecuritySolutionVisible && (indicesExist || dataViewId === null),
    [indicesExist, dataViewId, userHasSecuritySolutionVisible]
  );

  const getIsTimelineVisible = useCallback(
    (pathname: string) => {
      if (!isTimelineAllowed) {
        return false;
      }
      return isTimelinePathVisible(pathname, isGroupedNavigationEnabled);
    },
    [isTimelineAllowed, isGroupedNavigationEnabled]
  );

  return getIsTimelineVisible;
};
