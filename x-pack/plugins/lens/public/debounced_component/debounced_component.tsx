/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useEffect, memo, FunctionComponent } from 'react';
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
    const debouncePropsChange = useMemo(() => debounce(setCachedProps, delay), [setCachedProps]);

    // cancel debounced prop change if component has been unmounted in the meantime
    useEffect(() => () => debouncePropsChange.cancel(), [debouncePropsChange]);
    debouncePropsChange(props);

    return React.createElement(MemoizedComponent, cachedProps);
  };
}
