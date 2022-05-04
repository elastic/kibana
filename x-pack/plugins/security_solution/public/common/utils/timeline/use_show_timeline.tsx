/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

const HIDDEN_TIMELINE_ROUTES: readonly string[] = [
  `/cases/configure`,
  '/administration',
  '/rules/create',
  '/get_started',
  '/threat_hunting',
  '/dashboards',
  '/manage',
];

const isHiddenTimelinePath = (currentPath: string): boolean => {
  return !!HIDDEN_TIMELINE_ROUTES.find((route) => matchPath(currentPath, route));
};

export const useShowTimeline = () => {
  const { pathname } = useLocation();
  const [showTimeline, setShowTimeline] = useState(!isHiddenTimelinePath(pathname));

  useEffect(() => {
    setShowTimeline(!isHiddenTimelinePath(pathname));
  }, [pathname]);

  return [showTimeline];
};
