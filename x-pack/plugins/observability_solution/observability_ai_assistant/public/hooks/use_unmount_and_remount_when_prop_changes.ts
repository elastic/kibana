/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';

export function useUnmountAndRemountWhenPropChanges(currentProp: string) {
  const prevPropRef = useRef(currentProp);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    if (prevPropRef.current !== currentProp) {
      setShouldRender(false);
    }
  }, [prevPropRef, currentProp]);

  useEffect(() => {
    if (!shouldRender) {
      setShouldRender(true);
    }
  }, [shouldRender]);

  useEffect(() => {
    prevPropRef.current = currentProp;
  }, [currentProp]);

  return shouldRender;
}
