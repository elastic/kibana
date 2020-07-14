/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext } from 'react';
import { useThrottledResizeObserver } from '../utils';

const EventDetailsWidthContext = createContext(0);

export const useEventDetailsWidthContext = () => useContext(EventDetailsWidthContext);

export const EventDetailsWidthProvider = React.memo(({ children }) => {
  const { ref, width } = useThrottledResizeObserver();

  return (
    <>
      <EventDetailsWidthContext.Provider value={width}>
        {children}
      </EventDetailsWidthContext.Provider>
      <div ref={ref} />
    </>
  );
});

EventDetailsWidthProvider.displayName = 'EventDetailsWidthProvider';
