/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect } from 'react';
import { useRouteSpy } from '../route/use_route_spy';

const hideTimelineForRoutes = [`/cases/configure`, '/management'];

export const useShowTimeline = () => {
  const [{ pageName, pathName }] = useRouteSpy();

  const [showTimeline, setShowTimeline] = useState(
    !hideTimelineForRoutes.includes(window.location.pathname)
  );

  useEffect(() => {
    if (
      hideTimelineForRoutes.filter((route) => window.location.pathname.includes(route)).length > 0
    ) {
      if (showTimeline) {
        setShowTimeline(false);
      }
    } else if (!showTimeline) {
      setShowTimeline(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageName, pathName]);

  return [showTimeline];
};
