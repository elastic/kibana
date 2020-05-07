/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo, memo, FunctionComponent } from 'react';
import { debounce } from 'lodash';

/**
 * debouncedComponent wraps the specified React component, returning a component which
 * only renders once there is a pause in props changes for at least `delay` milliseconds.
 * During the debounce phase, it will return the previously rendered value.
 */
export function debouncedComponent<TProps>(component: FunctionComponent<TProps>, delay = 256) {
  const MemoizedComponent = (memo(component) as unknown) as FunctionComponent<TProps>;

  return (props: TProps) => {
    const [cachedProps, setCachedProps] = useState(props);
    const delayRender = useMemo(() => debounce(setCachedProps, delay), []);

    delayRender(props);

    return React.createElement(MemoizedComponent, cachedProps);
  };
}
